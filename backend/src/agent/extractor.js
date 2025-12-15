import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function extractMedicalInfo(text) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",  
      messages: [
        {
          role: "system",
          content: `Return ONLY a valid JSON object with EXACTLY this structure:

{
  "symptoms": [],
  "duration": "",
  "severity": "",
  "medications": [
      { "name": "", "dose": "", "frequency": "" }
  ],
  "allergies": [],
  "conditions": [],
  "notes": ""
}

NO explanations. NO markdown. NO commentary.`
        },
        { role: "user", content: text }
      ],
      temperature: 0,
      max_tokens: 300
    });

    let raw = response.choices?.[0]?.message?.content || "{}";

    // remove markdown wrapper
    raw = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(raw);

  } catch (err) {
    console.error("Extractor error:", err);
    return {};
  }
}
