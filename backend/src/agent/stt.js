import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(buffer) {
  try {
    const response = await client.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1"
    });

    return response.text;
  } catch (err) {
    console.error("STT Error:", err);
    return "";
  }
}
