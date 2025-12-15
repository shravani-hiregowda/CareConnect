// src/routes/agentRoutes.js
import express from "express";
import AgentService from "../services/agentService.js";
import TTSService from "../services/ttsService.js";

const router = express.Router();

// POST /api/agent/message
router.post("/message", async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) return res.status(400).json({ success: false, message: "userId and text required" });

    const result = await AgentService.handleUserMessage(userId, text);
    return res.json({ success: true, reply: result.reply, extracted: result.extracted });
  } catch (err) {
    console.error("Agent /message error:", err);
    return res.status(500).json({ success: false, message: "Agent error", error: err?.message || err });
  }
});

// POST /api/agent/tts -> returns audio bytes
router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "text required" });

    const buffer = await TTSService.synthesizeSpeechBuffer(text);
    if (!buffer) throw new Error("TTS failed");

    // set content type depending on TTS (mp3 assumed)
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("Agent /tts error:", err);
    return res.status(500).json({ success: false, message: "TTS error", error: err?.message || err });
  }
});

export default router;
