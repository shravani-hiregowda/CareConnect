import Groq from "groq-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// -------------------- CLIENTS --------------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// -------------------- JSON PARSER --------------------
function tryParseJSONFromText(text) {
  if (!text) return null;

  const m = text.match(/\{[\s\S]*\}/m);
  if (!m) return null;

  try {
    return JSON.parse(m[0]);
  } catch (_) {
    try {
      let fixed = m[0]
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(fixed);
    } catch (_) {
      return null;
    }
  }
}

// -------------------- HEURISTICS --------------------
const heuristics = {
  dateRegexes: [
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g,
    /\b(\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]* \d{2,4})\b/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b/gi
  ],

  genderRegex: /\b(male|female|m|f)\b/i,
  patientIdRegex: /\b(CC[- ]?PT[- ]?[0-9A-Za-z]+)\b/i,
  nameLineRegex: /(Patient Name|Name)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,

  vitals: {
    bp: /\b(\d{2,3}\/\d{2,3})\b/,
    hr: /\b(Heart Rate|HR|Pulse)[:\s]*?(\d{2,3})\b/i,
    temp: /\b(Temp|Temperature)[:\s]*?([0-4]?\d(?:\.\d)? ?(?:°F|°C|F|C))\b/i,
    spo2: /\b(SpO2|Oxygen Saturation)[:\s]*?(\d{2,3})%?\b/i,
    rr: /\b(Respiratory Rate|RR)[:\s]*?(\d{1,2})\b/i
  },

  phone: /(\+?\d{1,3}[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,

  // ⭐ Medication blocks
  medicationBlock:
    /(Medications(?: on Discharge)?|Medication Prescribed|Discharge Medications)[\s:]*([\s\S]*?)(?=\n[A-Z][^\n]*:|$)/i,

  // ⭐ Pipe-separated format
  pipeFormat: /(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*)/g,

  // ⭐ Bullet list format
  bulletFormat: /(?:\d+\.|\•|\-)\s*([A-Za-z0-9 \-]+)\s+(\d+[^\s]+)\s*[\–-]\s*(.+)/g
};

// -------------------- HEURISTIC EXTRACTION --------------------
function runHeuristicsOnText(text, current = {}) {
  const out = { ...current };

  // DATES
  if (!out.admissionDate || !out.dischargeDate) {
    for (const rx of heuristics.dateRegexes) {
      const all = [...text.matchAll(rx)].map(x => x[1] || x[0]);
      if (all.length >= 2) {
        if (!out.admissionDate) out.admissionDate = all[0];
        if (!out.dischargeDate) out.dischargeDate = all[1];
      }
    }
  }

  // GENDER
  if (!out.gender) {
    const g = text.match(heuristics.genderRegex);
    if (g) out.gender = g[0].toLowerCase().startsWith("m") ? "Male" : "Female";
  }

  // PATIENT ID
  if (!out.patientId) {
    const id = text.match(heuristics.patientIdRegex);
    if (id) out.patientId = id[0];
  }

  // NAME
  if (!out.patientName) {
    const n = text.match(heuristics.nameLineRegex);
    if (n) out.patientName = n[2].trim();
  }

  // VITALS
  const v = heuristics.vitals;

  if (!out.bloodPressure) {
    const m = text.match(v.bp);
    if (m) out.bloodPressure = m[1] || m[0];
  }

  if (!out.heartRate) {
    const m = text.match(v.hr);
    if (m) out.heartRate = m[2];
  }

  if (!out.temperature) {
    const m = text.match(v.temp);
    if (m) out.temperature = m[2] || m[1];
  }

  if (!out.oxygenSaturation) {
    const m = text.match(v.spo2);
    if (m) out.oxygenSaturation = m[2];
  }

  if (!out.respiratoryRate) {
    const m = text.match(v.rr);
    if (m) out.respiratoryRate = m[2];
  }

  // PHONE / EMERGENCY CONTACT
  if (!out.emergencyContacts) {
    const all = [...text.matchAll(heuristics.phone)].map(x => x[0]);
    if (all.length) out.emergencyContacts = all[0];
  }

  // -------------------- ⭐ MEDICATION EXTRACTION --------------------
  if (!Array.isArray(out.medications)) out.medications = [];

  const medBlock = text.match(heuristics.medicationBlock);
  if (medBlock && medBlock[2]) {
    const medText = medBlock[2];

    // Pipe-separated format
    for (const m of medText.matchAll(heuristics.pipeFormat)) {
      out.medications.push({
        name: m[1].trim(),
        dose: m[2].trim(),
        schedule: m[3].trim(),
        duration: m[4].trim(),
        notes: m[5].trim()
      });
    }

    // Bullet list format
    for (const m of medText.matchAll(heuristics.bulletFormat)) {
      out.medications.push({
        name: m[1].trim(),
        dose: m[2].trim(),
        schedule: m[3].trim(),
        duration: null,
        notes: null
      });
    }
  }

  return out;
}

// -------------------- MAIN AI EXTRACTOR --------------------
export const callAIExtractorService = async (text, options = {}) => {
  try {
    if (!text) return {};

    const prompt = `
You are a medical document extraction AI.
Return ONLY valid JSON.
Missing values must be null.

JSON schema:
{
  "patientName": null,
  "age": null,
  "gender": null,
  "patientId": null,
  "hospitalCode": null,
  "primaryPhysician": null,
  "admissionDate": null,
  "dischargeDate": null,
  "primaryDiagnosis": null,
  "secondaryNotes": null,
  "procedure": null,
  "surgeryDate": null,
  "complications": null,
  "treatmentSummary": null,
  "temperature": null,
  "heartRate": null,
  "bloodPressure": null,
  "oxygenSaturation": null,
  "respiratoryRate": null,
  "dischargeMeds": null,
  "followUpPlan": null,
  "homeCare": null,
  "emergencyContacts": null,
  "medications": []    // ⭐ include medication array
}

TEXT:
${text}
`;

    const model =
      options.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const result = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let raw = result.choices?.[0]?.message?.content || "";
    let parsed = tryParseJSONFromText(raw);

    // Fall back to heuristics
    let final = parsed || {};

    final = runHeuristicsOnText(text, final);

    return final;
  } catch (err) {
    console.error("AI Extract Error:", err);
    return runHeuristicsOnText(text, {});
  }
};

// -------------------- CHAT BOT --------------------
export async function getAIResponse(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a medical care companion AI." },
        { role: "user", content: message }
      ]
    });

    const text = completion.choices[0].message.content;

    return { text, risk: "normal" };
  } catch (_) {
    return { text: "I'm sorry, I couldn't process that.", risk: "normal" };
  }
}
