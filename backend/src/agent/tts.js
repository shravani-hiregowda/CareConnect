import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function synthesizeSpeech(text) {
  try {
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text
    });

    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.error("TTS error:", err);
    return null;
  }
}
