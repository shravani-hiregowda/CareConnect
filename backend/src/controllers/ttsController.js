import axios from "axios";
import { detectLanguage } from "../utils/languageDetector.js";

export async function generateTTS(req, res) {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text required" });
    }

    // Detect desired language
    const lang = detectLanguage(text); // "en", "hi", "kn"

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${lang}&client=tw-ob`;

    const mp3 = await axios.get(url, { responseType: "arraybuffer" });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": mp3.data.length,
    });

    return res.send(mp3.data);
  } catch (err) {
    console.error("Server TTS error:", err);
    return res.status(500).json({ error: "TTS generation failed" });
  }
}
