// src/services/agentService.js
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Patient from "../models/Patient.js";
import PatientMemory from "../models/PatientMemory.js";

import { doctorReply } from "../agent/llm.js";
import { extractMedicalInfo } from "../agent/extractor.js";

import {
  loadMemory,
  saveConversation,
  extractSymptoms,
  addSymptoms,
  updateLongTermSummary
} from "./memoryService.js";

const safeMinTextLen = 2;

/**
 * Hybrid AgentService
 * - Keeps extractor & memory features, but throttles/circuits them to maintain responsiveness.
 * - Protects against ObjectId cast errors by preferring Patient._id when available.
 * - Uses an in-memory fallback memory for ephemeral identities that don't map to a Patient yet.
 */

/* -------------------------
   In-memory fallback cache
   (used when Patient._id isn't available to avoid ObjectId casts)
   ------------------------- */
const ephemeralMemoryCache = new Map(); // patientIdStr -> { conversationHistory:[], symptomsTimeline:[], longTermSummary: "" }

/* -------------------------
   Debounce / throttle for long-term summary updates
   Keeps summary updates to once per `SUMMARY_COOLDOWN_MS` per patient
   ------------------------- */
const lastSummaryUpdateAt = new Map();
const SUMMARY_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/* -------------------------
   Small helper: safe JSON parse
   ------------------------- */
function safeJSONParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/* -------------------------
   Helper: promise timeout wrapper
   ------------------------- */
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

/* -------------------------
   Quick heuristic: should we run the heavy medical extractor?
   Run if message is long or contains medical keywords.
   ------------------------- */
function shouldRunMedicalExtractor(text) {
  if (!text || typeof text !== "string") return false;
  const words = text.trim().split(/\s+/).length;
  if (words >= 10) return true; // long message
  // keywords (extend as needed)
  const KW = /\b(fever|pain|chest|breath|bleeding|suicid|dizzy|vomit|cough|infect|feverish|shortness|breathlessness|bp|blood pressure)\b/i;
  return KW.test(text);
}

/* -------------------------
   Ensure we have a safe "memoryId" for PatientMemory operations.
   If a real Patient exists, use profile._id. Otherwise use ephemeral cache.
   Returns an object:
    { useEphemeral: boolean, memoryId: ObjectId|null, epKey: string|null, memory: object|null }
   ------------------------- */
async function resolveMemoryIdentity(patientId) {
  // If patientId is already a valid ObjectId string, try find by _id
  let profile = null;
  try {
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      profile = await Patient.findById(patientId);
    }
    if (!profile) {
      // try patient.patientId field (your model includes patientId string)
      profile = await Patient.findOne({ patientId });
    }
  } catch (e) {
    profile = null;
  }

  if (profile && profile._id) {
    // Attempt to load real PatientMemory (loadMemory internally expects a valid id)
    return { useEphemeral: false, memoryId: profile._id.toString(), profile };
  }

  // No canonical patient found -> use ephemeral memory keyed by original patientId string
  const epKey = String(patientId || "unknown");
  if (!ephemeralMemoryCache.has(epKey)) {
    ephemeralMemoryCache.set(epKey, {
      patientId: epKey,
      conversationHistory: [],
      symptomsTimeline: [],
      longTermSummary: ""
    });
  }
  return { useEphemeral: true, epKey, memory: ephemeralMemoryCache.get(epKey) };
}

/* -------------------------
   Lightweight in-process memory accessor when ephemeral
   (keeps parity with saveConversation/addSymptoms usage in memoryService)
   ------------------------- */
async function ephemeralSaveConversation(epKey, from, message) {
  const mem = ephemeralMemoryCache.get(epKey) || { conversationHistory: [] };
  mem.conversationHistory = mem.conversationHistory || [];
  mem.conversationHistory.push({ from, message, timestamp: new Date() });
  mem.lastConversation = new Date();
  ephemeralMemoryCache.set(epKey, mem);
}

async function ephemeralAddSymptoms(epKey, symptoms = [], severity = 0) {
  const mem = ephemeralMemoryCache.get(epKey) || { symptomsTimeline: [] };
  mem.symptomsTimeline = mem.symptomsTimeline || [];
  const entries = symptoms.map(s => ({ symptom: String(s).trim(), severity: severity || 0, date: new Date() }));
  mem.symptomsTimeline.push(...entries);
  ephemeralMemoryCache.set(epKey, mem);
}

/* -------------------------
   Expose AgentService
   ------------------------- */
const AgentService = {

  /**
   * Build a compact LLM context using loaded memory & profile.
   * If we're ephemeral, build context from ephemeral cache.
   */
  async buildLLMContext(patientId, memory, extractedFromLast = {}) {
    // prefer Patient lookup for profile
    let profile = null;
    try {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        profile = await Patient.findById(patientId);
      }
      if (!profile) {
        profile = await Patient.findOne({ patientId }) || null;
      }
    } catch (e) {
      profile = null;
    }

    const patientName = profile?.patientName || profile?.fullName || patientId || "Patient";
    const pid = profile?.patientId || (profile?._id?.toString()) || patientId;

    const longTerm = typeof memory?.longTermSummary === "string" && memory.longTermSummary.length
      ? memory.longTermSummary
      : "No long-term summary available.";

    const recentSymptoms = Array.isArray(memory?.symptomsTimeline)
      ? memory.symptomsTimeline.slice(-6).map(s => {
          // support multiple minor schema shapes (symptom vs symptoms array)
          const symptomName = s.symptom || (Array.isArray(s.symptoms) ? s.symptoms.join(", ") : "");
          return `${symptomName} (${s.severity ?? "unknown"}) - ${new Date(s.date || s.timestamp || Date.now()).toISOString().split("T")[0]}`;
        })
      : [];

    const lastMessages = Array.isArray(memory?.conversationHistory)
      ? memory.conversationHistory.slice(-8).map(m => `${m.from.toUpperCase()}: ${m.message || m.text || ""}`)
      : [];

    const extractedString = JSON.stringify(extractedFromLast || {});

    const profileLines = [];
    if (profile) {
      if (profile.patientName) profileLines.push(`Name: ${profile.patientName}`);
      if (profile.age) profileLines.push(`Age: ${profile.age}`);
      if (profile.gender) profileLines.push(`Gender: ${profile.gender}`);
      if (profile.primaryDiagnosis) profileLines.push(`Diagnosis: ${profile.primaryDiagnosis}`);
      if (Array.isArray(profile.medications) && profile.medications.length) {
        profileLines.push(`Medications: ${profile.medications.map(m => m.name || "").join(", ")}`);
      }
      if (profile.followUpPlan) profileLines.push(`Follow-up: ${profile.followUpPlan}`);
      if (profile.emergencyContacts) profileLines.push(`EmergencyContacts: ${profile.emergencyContacts}`);
    }

    const ctx = `
PATIENT CONTEXT (FOR REASONING ONLY — DO NOT REPEAT VERBATIM):

Patient identity: ${pid}
Patient name: ${patientName}
Profile: ${profileLines.length ? profileLines.join("; ") : "No profile on record."}

Long-term summary: ${longTerm}

Recent symptoms (most recent first): ${recentSymptoms.length ? recentSymptoms.join(" | ") : "None recorded"}

Recent conversation snippets: ${lastMessages.length ? lastMessages.join(" || ") : "No recent messages"}

Extracted fields from latest message: ${extractedString}

NOTE:
Use this only to personalize. Never quote raw medical data directly.
Ask only ONE question at a time.
`;

    return { ctx, patientName, pid, profile };
  },

  /**
   * Main handler
   * - Performs fast-path reply generation
   * - Runs expensive extractors with timeouts
   * - Debounces long-term summary updates
   */
  async handleUserMessage(patientId, text) {
    if (!text || typeof text !== "string") text = "";
    const trimmed = text.trim();

    // quick save to Conversation (transcript) - non-blocking but attempt
    try {
      await Conversation.updateOne(
        { userId: patientId },
        { $push: { messages: { from: "user", text: trimmed, timestamp: new Date() } } },
        { upsert: true }
      );
    } catch (e) {
      // non-fatal; log and continue
      console.warn("Conversation update failed:", e?.message || e);
    }

    // sanitize
    if (!trimmed || trimmed.length < safeMinTextLen) {
      // also persist to memory store (ephemeral or real)
      try {
        const resolved = await resolveMemoryIdentity(patientId);
        if (resolved.useEphemeral) await ephemeralSaveConversation(resolved.epKey, "user", trimmed);
        else await saveConversation(resolved.memoryId, "user", trimmed);
      } catch (e) { /* ignore */ }

      return { reply: "I didn't catch that — could you say that again?", extracted: {} };
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("user-") || trimmed.startsWith("CC-PT")) {
      return { reply: "Could you rephrase that for me?", extracted: {} };
    }

    // language hints stored per-session (lightweight)
    // let language mode be stored on Conversation.extracted.languageMode if needed (not mandatory)
    // Detect explicit language-switch words locally - quick heuristic
    const lower = trimmed.toLowerCase();
    let languageMode = "en";
    if (/\bkannada\b/i.test(lower) || /\bhowdu\b/i.test(lower)) languageMode = "kn";
    else if (/\bhindi\b/i.test(lower) || /\bhai\b/i.test(lower) || /\bkya\b/i.test(lower)) languageMode = "hi";

    // Resolve memory identity (prefer real Patient._id, fallback ephemeral)
    const resolved = await resolveMemoryIdentity(patientId);

    // Persist cleaned message into memory store (safe)
    try {
      if (resolved.useEphemeral) {
        await ephemeralSaveConversation(resolved.epKey, "user", trimmed);
      } else {
        // pass profile._id string into saveConversation (memoryService uses patientId to find/create)
        await saveConversation(resolved.memoryId, "user", trimmed);
      }
    } catch (e) {
      console.warn("saveConversation failed:", e?.message || e);
    }

    // -----------------------
    // Symptom extraction (fast) with timeout
    // -----------------------
    let symptoms = [];
    let severity = 0;
    try {
      // keep this very quick (1.2s)
      const st = await withTimeout(extractSymptoms(trimmed), 1200, { symptoms: [], severity: 0 });
      if (st && Array.isArray(st.symptoms) && st.symptoms.length) {
        symptoms = st.symptoms;
        severity = st.severity ?? 0;
        // persist symptoms (best-effort)
        try {
          if (resolved.useEphemeral) await ephemeralAddSymptoms(resolved.epKey, symptoms, severity);
          else await addSymptoms(resolved.memoryId, symptoms, severity);
        } catch (e) {
          console.warn("addSymptoms failed:", e?.message || e);
        }
      }
    } catch (e) {
      console.warn("extractSymptoms failed:", e?.message || e);
    }

    // -----------------------
    // Medical JSON extractor (run only on need or longer messages)
    // -----------------------
    let extracted = {};
    if (shouldRunMedicalExtractor(trimmed)) {
      try {
        // give extractor a tight timeout (2s). If it fails or times out, continue without it.
        const res = await withTimeout(extractMedicalInfo(trimmed), 2000, null);
        if (res && typeof res === "object") extracted = res;
        // try to merge extracted into Conversation.extracted below
      } catch (e) {
        console.warn("extractMedicalInfo failed:", e?.message || e);
        extracted = {};
      }
    }

    // -----------------------
    // Load memory (for building context). Prefer ephemeral memory when appropriate.
    // -----------------------
    let memory = null;
    try {
      if (resolved.useEphemeral) {
        memory = resolved.memory;
      } else {
        // call loadMemory with actual Patient._id (string of ObjectId)
        memory = await loadMemory(resolved.memoryId);
      }
    } catch (e) {
      console.warn("loadMemory failed:", e?.message || e);
      memory = resolved.useEphemeral ? resolved.memory : null;
    }

    // -----------------------
    // Build context + call doctorReply (LLM) - keep call blocking but as fast as possible
    // -----------------------
    let replyText = "Sorry, I couldn't compose a reply just now.";
    try {
      const { ctx } = await this.buildLLMContext(resolved.useEphemeral ? (resolved.epKey) : resolved.memoryId, memory, extracted);

      // doctorReply signature historically: doctorReply(patientId, userText, medicalContext)
      // We'll pass languageMode as a 4th param if supported by your LLM wrapper; harmless otherwise.
      // Use a short timeout wrapper around doctorReply if you want (but prefer it to complete).
      // Here we allow it to take up to 7 seconds before falling back.
      const drPromise = doctorReply(patientId, trimmed, ctx, languageMode);
      const maybe = await withTimeout(drPromise, 7000, null);
      if (typeof maybe === "string" && maybe.trim().length) {
        replyText = maybe.trim();
      } else {
        // if the LLM failed fast, provide a short fallback
        replyText = "I'm sorry — could you say that again in a different way?";
      }
    } catch (e) {
      console.error("doctorReply error:", e?.message || e);
      replyText = "Apologies — I encountered an error while replying.";
    }

    // -----------------------
    // Save doctor's reply to Conversation (transcript) + memory store
    // -----------------------
    try {
      await Conversation.updateOne(
        { userId: patientId },
        { $push: { messages: { from: "doctor", text: replyText, timestamp: new Date() } } },
        { upsert: true }
      );
    } catch (e) {
      console.warn("Conversation doctor save failed:", e?.message || e);
    }

    try {
      if (resolved.useEphemeral) {
        await ephemeralSaveConversation(resolved.epKey, "doctor", replyText);
      } else {
        await saveConversation(resolved.memoryId, "doctor", replyText);
      }
    } catch (e) {
      console.warn("saveConversation(doctor) failed:", e?.message || e);
    }

    // -----------------------
    // Merge extracted JSON into Conversation.extracted (best-effort)
    // -----------------------
    try {
      const conv = await Conversation.findOne({ userId: patientId });
      const prev = conv?.extracted || {};
      const merged = { ...prev, ...(extracted || {}) };
      await Conversation.updateOne({ userId: patientId }, { $set: { extracted: merged } }, { upsert: true });
    } catch (e) {
      console.warn("Conversation set extracted failed:", e?.message || e);
    }

    // -----------------------
    // Trigger long-term summary update ASYNC but debounced
    // Only call updateLongTermSummary if cooldown passed
    // -----------------------
    try {
      const key = resolved.useEphemeral ? `ep:${resolved.epKey}` : `id:${resolved.memoryId}`;
      const last = lastSummaryUpdateAt.get(key) || 0;
      const now = Date.now();
      if (now - last > SUMMARY_COOLDOWN_MS) {
        lastSummaryUpdateAt.set(key, now);
        // Update in background - but still catch errors
        (async () => {
          try {
            // call updateLongTermSummary only for real PatientMemory if available,
            // otherwise update ephemeral memory.longTermSummary locally (cheap)
            if (!resolved.useEphemeral) {
              await updateLongTermSummary(resolved.memoryId);
            } else {
              // For ephemeral, create a cheap summary heuristically (or skip)
              // Simple heuristic: if more than N user messages, set a short summary
              const mem = ephemeralMemoryCache.get(resolved.epKey);
              if (mem && Array.isArray(mem.conversationHistory) && mem.conversationHistory.length >= 6) {
                // cheap short summary built from last messages
                const recent = mem.conversationHistory.slice(-20).map(m => `${m.from.toUpperCase()}: ${m.message}`).join("\n");
                // You could call a small local summarizer here if available. For now, store the raw snippet.
                mem.longTermSummary = `Recent conversation (ephemeral): ${recent.slice(0, 400)}`;
                ephemeralMemoryCache.set(resolved.epKey, mem);
              }
            }
          } catch (e) {
            console.warn("updateLongTermSummary (background) failed:", e?.message || e);
            // allow retry after shorter backoff if it failed
            lastSummaryUpdateAt.set(key, Date.now() - SUMMARY_COOLDOWN_MS / 2);
          }
        })();
      }
    } catch (e) {
      console.warn("long term summary scheduling failed:", e?.message || e);
    }

    // -----------------------
    // Final return
    // -----------------------
    return {
      reply: replyText,
      extracted
    };
  },

  /**
   * finalizeCall(patientId) - force summary and persist
   */
  async finalizeCall(patientId) {
    if (!patientId) throw new Error("patientId required for finalizeCall");

    try {
      // Resolve identity first
      const resolved = await resolveMemoryIdentity(patientId);

      let summary = null;
      if (!resolved.useEphemeral) {
        summary = await updateLongTermSummary(resolved.memoryId);
        // persist summary into Conversation.extracted.notes
        if (summary && summary.length) {
          await Conversation.updateOne({ userId: patientId }, { $set: { "extracted.notes": summary } }, { upsert: true });
        }
      } else {
        const mem = ephemeralMemoryCache.get(resolved.epKey);
        summary = mem?.longTermSummary || "";
        await Conversation.updateOne({ userId: patientId }, { $set: { "extracted.notes": summary } }, { upsert: true });
      }

      const summaryMsg = `Call summary: ${summary || "No significant summary generated."}`;
      await Conversation.updateOne(
        { userId: patientId },
        { $push: { messages: { from: "doctor", text: summaryMsg, timestamp: new Date() } } },
        { upsert: true }
      );

      return summary;
    } catch (e) {
      console.error("finalizeCall failed:", e?.message || e);
      return null;
    }
  }
};

export default AgentService;
