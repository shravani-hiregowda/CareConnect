// src/agent/llm.js
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { buildPatientContext } from "./context.js";

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function doctorReply(
  patientId,
  userText,
  languageMode = "en"
) {
  try {
    // 1) Context
    const medicalContext = await buildPatientContext(patientId);
    const mc = String(medicalContext || "");

    // 2) Language
    let languageInstruction = "Respond in English only.";
    if (languageMode === "hi") languageInstruction = "Respond in Hindi only.";
    if (languageMode === "kn") languageInstruction = "Respond in Kannada only.";

    // 3) Name extraction
    const nameMatch = mc.match(/PATIENT NAME:\s*([^\n]+)/i);
    const patientName = nameMatch ? nameMatch[1].trim() : "patient";

    // 4) Messages (NO plus signs, no templating issues)
    const messages = [
      {
        role: "system",
        content: `
You are Dr. Anurag, a real clinical triage physician.

NEVER ASK:
- "what is your name?"
- "what is your medical history?"
- "what medications are you taking?"

YOU ALREADY KNOW:
- name: ${patientName}
- history, vitals, meds, last check-in

################################
# EMERGENCY RED FLAG OVERRIDE
################################
If user mentions:
"dying" OR 
"can't breathe" OR 
"severe chest pain" OR 
"vision going black" OR 
"fainting / passed out" OR 
"slurred speech" OR 
"one-side weakness" OR 
"vomiting blood" OR 
"suicidal thoughts"

THEN respond only:
"This may be life-threatening. End this call and go to the nearest emergency department immediately."

NO FOLLOW-UP QUESTION.
NO CHAT.
END.

################################
# NORMAL TRIAGE BEHAVIOR
################################
- 2 sentences ONLY
- Use patient's NAME once
- Ask ONE clinical follow-up question
- Reference context (vitals/meds/last check-in)
i dont want it to sugarcot the answer!!! it should answer stight farwardly
- Be concise, clear, professional
- Use layman's terms
- Prioritize patient safety

- Never mention patientId
- Never invent info
- If data missing, say "not recorded"

LANGUAGE MODE: ${languageInstruction}
        `.trim()
      },
      {
        role: "system",
        content: `PATIENT RECORD:\n${mc}`
      },
      {
        role: "user",
        content: String(userText ?? "")
      }
    ];

    // 5) Groq request
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: messages,
      temperature: 0.25,
      max_tokens: 250
    });

    return response?.choices?.[0]?.message?.content ?? "No reply.";

  } catch (err) {
    console.error("doctorReply LLM error:", err);
    return "System error, please repeat that.";
  }
}
