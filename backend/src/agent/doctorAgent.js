// server/src/agent/doctorAgent.js
import { Room } from "livekit-server-sdk";
import { transcribeAudio } from "./stt.js";
import AgentService from "../services/agentService.js";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import path from "path";

dotenv.config();

/**
 * Doctor Agent (LiveKit)
 *
 * - Silence-buffering per participant
 * - Single utterance -> single transcription -> AgentService.handleUserMessage
 * - agentSpeaking guard to avoid self-hear
 * - On participant disconnect -> AgentService.finalizeCall
 *
 * NOTES:
 * - This agent intentionally DOES NOT publish TTS audio back into the LiveKit room.
 *   The client plays TTS locally to avoid infinite loops.
 */

const AGENT_IDENTITY = process.env.AGENT_IDENTITY || "doctor-agent";
const SILENCE_MS = Number(process.env.AGENT_SILENCE_MS || 700);
const SAMPLE_RATE = Number(process.env.AGENT_SAMPLE_RATE || 48000); // if you need to resample, do so in stt.js

let agentSpeaking = false; // in-memory guard (single-process). For multi-process, use a shared store.

// small helper for debugging: save temp wav (optional)
function writeTempWav(buf) {
  try {
    const p = path.join(os.tmpdir(), `careconnect-${Date.now()}.wav`);
    fs.writeFileSync(p, buf);
    console.log("[agent] WAV saved:", p);
    return p;
  } catch (e) {
    console.warn("[agent] writeTempWav failed:", e?.message || e);
    return null;
  }
}

// Minimal WAV assembler assuming incoming frames are Float32LE Buffers or Float32Arrays.
// If your LiveKit track frames are already encoded differently, adapt transcode accordingly.
function framesToWavBuffer(frames, sampleRate = SAMPLE_RATE) {
  // Attempt to coerce buffers to Float32 chunks
  const floatChunks = [];
  let totalLen = 0;

  for (const f of frames) {
    if (!f) continue;
    if (Buffer.isBuffer(f)) {
      // assume Float32LE buffer (4 bytes per sample)
      const float32 = new Float32Array(f.buffer, f.byteOffset, Math.floor(f.byteLength / 4));
      floatChunks.push(float32);
      totalLen += float32.length;
    } else if (ArrayBuffer.isView(f)) {
      const float32 = new Float32Array(f.buffer || f);
      floatChunks.push(float32);
      totalLen += float32.length;
    } else if (Array.isArray(f)) {
      const float32 = new Float32Array(f);
      floatChunks.push(float32);
      totalLen += float32.length;
    } else {
      // ignore unknown
    }
  }

  const concatenated = new Float32Array(totalLen);
  let offset = 0;
  for (const c of floatChunks) {
    concatenated.set(c, offset);
    offset += c.length;
  }

  // Convert Float32 -> 16-bit PCM
  const buffer16 = Buffer.alloc(concatenated.length * 2);
  for (let i = 0; i < concatenated.length; i++) {
    let s = Math.max(-1, Math.min(1, concatenated[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer16.writeInt16LE(Math.floor(int16), i * 2);
  }

  // WAV header (PCM 16-bit mono)
  const wavHeader = Buffer.alloc(44);
  const byteRate = sampleRate * 2; // mono * 16-bit
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + buffer16.length, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(1, 22); // channels
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(2, 32); // blockAlign
  wavHeader.writeUInt16LE(16, 34); // bitsPerSample
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(buffer16.length, 40);

  return Buffer.concat([wavHeader, buffer16]);
}

export default async function startDoctorAgent() {
  console.log("🤖 Doctor Agent Starting (LiveKit integration)...");

  const room = new Room({
    host: process.env.LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  });

  try {
    await room.connect();
    console.log("✅ Connected to LiveKit as agent");
  } catch (err) {
    console.error("[agent] LiveKit connect failed:", err?.message || err);
    throw err;
  }

  // per-participant buffers & timers
  const stateByParticipant = new Map();

  room.on("trackSubscribed", (track, publication, participant) => {
    // We only care about audio tracks here
    if (!track || track.kind !== "audio") return;

    console.log(`[agent] trackSubscribed from=${participant.identity}`);

    // init state
    if (!stateByParticipant.has(participant.identity)) {
      stateByParticipant.set(participant.identity, {
        frames: [],
        silenceTimer: null,
        lastProcessAt: 0
      });
    }
    const state = stateByParticipant.get(participant.identity);

    track.on("data", (audioFrame) => {
      try {
        // ignore if agent is known to be speaking (guard)
        if (agentSpeaking) return;

        // ignore audio from agent identity (if LiveKit gives agent identity)
        if (participant.identity === AGENT_IDENTITY) return;

        // accumulate frames
        state.frames.push(audioFrame);

        // reset silence timer
        if (state.silenceTimer) {
          clearTimeout(state.silenceTimer);
        }

        state.silenceTimer = setTimeout(async () => {
          // copy & clear frames
          const framesToProcess = state.frames.slice();
          state.frames.length = 0;

          if (!framesToProcess.length) return;

          try {
            // assemble wav for transcriber
            const wav = framesToWavBuffer(framesToProcess, SAMPLE_RATE);

            // OPTIONAL: save debug wav (commented out)
            // writeTempWav(wav);

            // Transcribe once per utterance (non-blocking—do not block on other participants)
            (async () => {
              try {
                const text = await transcribeAudio(wav);
                if (!text || !text.trim()) {
                  console.log(`[agent] empty transcription for ${participant.identity}`);
                  return;
                }

                console.log(`[agent] transcribed (${participant.identity}):`, text);

                // Delegate to AgentService which will update Conversation + PatientMemory + LLM
                try {
                  const result = await AgentService.handleUserMessage(participant.identity, text);
                  // result.reply will be stored by AgentService and returned if needed by other channels
                  console.log(`[agent] AgentService replied for ${participant.identity} (reply length=${(result?.reply||"").length})`);
                } catch (e) {
                  console.error(`[agent] AgentService.handleUserMessage failed:`, e?.message || e);
                }
              } catch (sttErr) {
                console.error("[agent] transcribeAudio error:", sttErr?.message || sttErr);
              }
            })();
          } catch (assembleErr) {
            console.error("[agent] assemble/transcribe error:", assembleErr?.message || assembleErr);
          }
        }, SILENCE_MS);
      } catch (err) {
        console.error("[agent] track data handler failed:", err?.message || err);
      }
    });

    track.on("ended", () => {
      console.log(`[agent] audio track ended for ${participant.identity}`);
      // cleanup buffers
      const s = stateByParticipant.get(participant.identity);
      if (s) {
        if (s.silenceTimer) clearTimeout(s.silenceTimer);
        stateByParticipant.delete(participant.identity);
      }
    });
  });

  // When a participant disconnects, finalize their memory (call summary)
  room.on("participantDisconnected", async (participant) => {
    try {
      console.log(`[agent] participantDisconnected: ${participant.identity}`);
      // finalize memory for that participant (safe to call multiple times)
      try {
        await AgentService.finalizeCall(participant.identity);
        console.log(`[agent] finalizeCall complete for ${participant.identity}`);
      } catch (e) {
        console.warn(`[agent] finalizeCall failed for ${participant.identity}:`, e?.message || e);
      }

      // cleanup participant state if any
      if (stateByParticipant.has(participant.identity)) {
        const s = stateByParticipant.get(participant.identity);
        if (s.silenceTimer) clearTimeout(s.silenceTimer);
        stateByParticipant.delete(participant.identity);
      }
    } catch (err) {
      console.error("[agent] participantDisconnected handler error:", err?.message || err);
    }
  });

  // optional: on server shutdown, cleanup
  process.on("SIGINT", async () => {
    console.log("[agent] SIGINT received — disconnecting room");
    try { await room.disconnect(); } catch (e) {}
    process.exit(0);
  });

  return room;
}
