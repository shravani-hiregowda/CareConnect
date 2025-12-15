// src/services/ttsService.js
import fetch from "node-fetch"; // ensure node-fetch v3+ in your project or use global fetch if available
import env from "../config/env.js";

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID; // recommended to set in .env
const ELEVEN_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const headers = {
  "Content-Type": "application/json",
  "xi-api-key": ELEVEN_KEY,
};

const TTSService = {
  async synthesizeSpeechBuffer(text) {
    if (!ELEVEN_KEY || !VOICE_ID) {
      throw new Error("ElevenLabs keys not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env");
    }

    try {
      const body = {
        text,
        voice: VOICE_ID,
        model: "eleven_monolingual_v1",
        // optional parameters below:
        // voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      };

      const resp = await fetch(ELEVEN_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error("ElevenLabs TTS error:", resp.status, errText);
        throw new Error("TTS provider error");
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer;
    } catch (err) {
      console.error("synthesizeSpeechBuffer error:", err?.message || err);
      throw err;
    }
  },
};

export default TTSService;
