// src/services/memoryService.js
import PatientMemory from "../models/PatientMemory.js";
import groqClient from "../agent/groqClient.js";

/* ---------------------------------------------------------
   LOAD MEMORY (creates one if missing)
--------------------------------------------------------- */
export async function loadMemory(patientId) {
  let mem = await PatientMemory.findOne({ patientId });
  if (!mem) mem = await PatientMemory.create({ patientId });
  return mem;
}

/* ---------------------------------------------------------
   SAVE CONVERSATION (Stores clean messages only)
--------------------------------------------------------- */
export async function saveConversation(patientId, from, message) {
  if (!message || typeof message !== "string") return;

  await PatientMemory.updateOne(
    { patientId },
    {
      $push: {
        conversationHistory: {
          from,
          message: message.trim(),
          timestamp: new Date()
        }
      },
      $set: { lastConversation: new Date() }
    },
    { upsert: true }
  );
}

/* ---------------------------------------------------------
   ADD SYMPTOMS (1 symptom per entry, clean format)
--------------------------------------------------------- */
export async function addSymptoms(patientId, symptoms = [], severity = 0) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) return;

  const entries = symptoms.map(s => ({
    symptom: String(s).trim(),
    severity: severity || 0,
    date: new Date()
  }));

  await PatientMemory.updateOne(
    { patientId },
    { $push: { symptomsTimeline: { $each: entries } } }
  );
}

/* ---------------------------------------------------------
   LIGHT SYMPTOM EXTRACTION (Groq)
--------------------------------------------------------- */
export async function extractSymptoms(text) {
  if (!groqClient) {
    return { symptoms: [], severity: 0 };
  }

  try {
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const prompt = `
Extract symptoms from this message.

Respond ONLY with valid JSON:
{"symptoms": ["..."], "severity": number (1-10)}

Message:
${text}
`;

    const res = await groqClient.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0
    });

    const raw = res.choices?.[0]?.message?.content || "{}";

    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { symptoms: [], severity: 0 };
    }

    return {
      symptoms: parsed.symptoms || [],
      severity: parsed.severity || 0
    };
  } catch (err) {
    console.warn("extractSymptoms error:", err?.message || err);
    return { symptoms: [], severity: 0 };
  }
}

/* ---------------------------------------------------------
   LONG TERM SUMMARY (LLM-based, clean)
--------------------------------------------------------- */
export async function updateLongTermSummary(patientId) {
  try {
    const mem = await PatientMemory.findOne({ patientId });
    if (!mem) return null;

    // Require at least 5 real messages
    const history = mem.conversationHistory || [];
    const cleanHistory = history.filter(
      m => m.message && typeof m.message === "string" && m.message.length > 2
    );

    if (cleanHistory.length < 5) {
      return mem.longTermSummary || "";
    }

    if (!groqClient) return mem.longTermSummary || "";

    // Take last 50 meaningful messages
    const recent = cleanHistory.slice(-50);

    const formatted = recent
      .map(m => `${m.from.toUpperCase()}: ${m.message}`)
      .join("\n");

    const prompt = `
Create a concise **clinical** patient summary (NOT a diagnosis).
Focus only on:
- Symptoms & severity
- Timeline
- Important medical patterns
- Recurring complaints
- Notable improvements

Return **1 short paragraph**.

Conversation:
${formatted}
`;

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const res = await groqClient.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    const summary = res.choices?.[0]?.message?.content?.trim() || "";

    await PatientMemory.updateOne(
      { patientId },
      { longTermSummary: summary }
    );

    return summary;
  } catch (err) {
    console.warn("updateLongTermSummary failed:", err?.message || err);
    return null;
  }
}
