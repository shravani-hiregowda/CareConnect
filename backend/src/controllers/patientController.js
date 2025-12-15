  import Patient from "../models/Patient.js";
  import jwt from "jsonwebtoken";
  import { extractPDFText } from "../services/pdfService.js";
  import { callAIExtractorService } from "../services/aiService.js";
  import axios from "axios";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
  const GROQ_MODEL = "llama-3.1-8b-instant";


  /* --------------------------------------------------------
    DATE NORMALIZATION
  ---------------------------------------------------------*/
  function toISO(dateString) {
    if (!dateString) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

    const months = {
      Jan: "01", January: "01",
      Feb: "02", February: "02",
      Mar: "03", March: "03",
      Apr: "04", April: "04",
      May: "05",
      Jun: "06", June: "06",
      Jul: "07", July: "07",
      Aug: "08", August: "08",
      Sep: "09", September: "09",
      Oct: "10", October: "10",
      Nov: "11", November: "11",
      Dec: "12", December: "12"
    };

    let m = dateString.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) {
      const day = m[1].padStart(2, "0");
      const month = months[m[2]] || months[m[2].substring(0, 3)];
      const year = m[3];
      if (month) return `${year}-${month}-${day}`;
    }

    m = dateString.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) {
      return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }

    return null;
  }

  /* --------------------------------------------------------
    PATIENT ID GENERATOR
  ---------------------------------------------------------*/
  function generateUniquePatientId() {
    const prefix = "CC-PT";
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${ts}${rand}`;
  }

  /* --------------------------------------------------------
    ALLOWED FIELDS (EXACT MONGO SCHEMA)
  ---------------------------------------------------------*/
  const ALLOWED_FIELDS = [
    "patientName", "age", "gender", "hospitalCode", "primaryPhysician",
    "admissionDate", "dischargeDate", "surgeryDate",
    "primaryDiagnosis", "secondaryNotes", "procedure", "complications",
    "treatmentSummary",
    "temperature", "heartRate", "bloodPressure", "oxygenSaturation", "respiratoryRate",
    "dischargeMeds", "followUpPlan", "homeCare", "emergencyContacts",
    "medications",
    "dob"
  ];

  /* --------------------------------------------------------
    PICK ALLOWED FIELDS
  ---------------------------------------------------------*/
  function pickAllowed(body) {
    const out = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) out[key] = body[key];
    }
    return out;
  }

  /* --------------------------------------------------------
    AI EXTRACTION
  ---------------------------------------------------------*/
  export const extractAI = async (req, res) => {
    try {
      const { text, fileUrl } = req.body;
      let extracted = text;

      if (!extracted && fileUrl) {
        extracted = await extractPDFText(fileUrl);
      }

      if (!extracted) {
        return res.status(400).json({ error: "No text to extract" });
      }

      const aiData = await callAIExtractorService(extracted);
      res.json({ data: aiData });

    } catch (err) {
      console.error("AI Error:", err);
      res.status(500).json({ error: "AI extraction failed" });
    }
  };

  /* --------------------------------------------------------
    REGISTER PATIENT (NURSE)
  ---------------------------------------------------------*/
  export const createPatientByNurse = async (req, res, next) => {
    try {
      const data = pickAllowed(req.body);

      data.admissionDate = toISO(data.admissionDate);
      data.dischargeDate = toISO(data.dischargeDate);
      data.surgeryDate = toISO(data.surgeryDate);

      if (Array.isArray(data.medications)) {
        data.medications = data.medications.map(m => ({
          name: m.name || "",
          dose: m.dose || "",
          notes: m.notes || "",
          schedule: {
            morning: !!m.schedule?.morning,
            afternoon: !!m.schedule?.afternoon,
            night: !!m.schedule?.night
          }
        }));
      }

      let id = req.body.patientId?.trim();
      if (!id) id = generateUniquePatientId();

      const exists = await Patient.findOne({ patientId: id });
      if (exists) {
        return res.status(409).json({ error: "Patient ID already exists" });
      }

      const patient = await Patient.create({
        ...data,
        patientId: id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json({ message: "Patient created", patient });

    } catch (err) {
      next(err);
    }
  };

  /* --------------------------------------------------------
    LOGIN (PATIENT)
  ---------------------------------------------------------*/
  export const loginPatient = async (req, res) => {
    try {
      const { patientId } = req.body;

      if (!patientId) {
        return res.status(400).json({ error: "Missing patientId" });
      }

      const patient = await Patient.findOne({ patientId });
      if (!patient) {
        return res.status(401).json({ error: "Patient not found" });
      }

      const token = jwt.sign(
        {
          id: patient._id,
          patientId: patient.patientId,
          role: "patient"
        },
        process.env.JWT_SECRET || "devsecret",
        { expiresIn: "8h" }
      );

      res.json({
        ok: true,
        token,
        patient: {
          _id: patient._id,
          patientId: patient.patientId,
          patientName: patient.patientName
        }
      });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  };

  /* --------------------------------------------------------
    PROFILE + DASHBOARD
  ---------------------------------------------------------*/
  export const getProfile = async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.user.id);
      res.json(patient);
    } catch (err) {
      next(err);
    }
  };

  export const updateProfile = async (req, res, next) => {
    try {
      const updates = pickAllowed(req.body);

      updates.admissionDate = toISO(updates.admissionDate);
      updates.dischargeDate = toISO(updates.dischargeDate);
      updates.surgeryDate = toISO(updates.surgeryDate);

      updates.updatedAt = new Date();

      const updated = await Patient.findByIdAndUpdate(req.user.id, updates, { new: true });
      res.json(updated);

    } catch (err) {
      next(err);
    }
  };

  export const getDashboardData = async (req, res, next) => {
    try {
      const patient = await Patient.findById(req.user.id);

      res.json({
        medications: patient.medications || [],
        appointments: patient.appointments?.slice(0, 3) || [],
        notificationsCount: 3,
        recentCheckins: patient.checkInHistory?.slice(-5) || []
      });

    } catch (err) {
      next(err);
    }
  };

  export async function chatWithPatientAI(req, res) {
    try {
      const { message } = req.body;
      const patientId = req.user.id;

      const patient = await Patient.findById(patientId)
        .populate("appointments")
        .populate("reports")
        .lean();

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Build context
      const context = `
  PATIENT SUMMARY:
  Name: ${patient.patientName}
  Age: ${patient.age}
  Gender: ${patient.gender}

  Diagnosis: ${patient.primaryDiagnosis}
  Treatment: ${patient.treatmentSummary}

  Vitals:
  - Blood Pressure: ${patient.bloodPressure}
  - Heart Rate: ${patient.heartRate}
  - Oxygen Saturation: ${patient.oxygenSaturation}

  Medications:
  ${patient.medications.map(m => `${m.name} ${m.dose}`).join(", ")}

  User Question:
  ${message}
      `;

      // AI CALL (GROQ)
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages: [
            {
  role: "system",
  content: `
You are a clinical medical assistant specializing in patient education and medical report summarization.
Your job is to read the provided medical report data and answer patient questions in a safe and structured format.

Rules:
1. NEVER invent data that is not present in the report or patient record.
2. If something is unclear or missing in the report, say "Not mentioned in the report" instead of guessing.
3. Do NOT diagnose, prescribe, or make treatment decisions.
4. DO explain all medical terms in simple, clear language.

Always answer in this exact format:

### Summary
(Brief 2–3 sentence overview of the patient’s current condition based on the report)

### Key Findings
(3–6 bullet points extracted from the medical report or patient data)

### Medications (if mentioned)
(1–5 bullet points: medication — purpose — when typically given)

### What this means for the patient
(Plain language explanation, without medical jargon)

### Safe Advice
(3–5 practical, non-prescription suggestions e.g. diet, hydration, rest)

### When to contact a doctor
(Bullet list of warning signs)

If the user asks a direct factual question (e.g. “What is my name? What medications do I take?”), answer briefly without the above format.

Never say “Consult a doctor” alone — instead give real guidance plus a safety reminder
.`
},

            { role: "user", content: context }
          ],
          temperature: 0.5,
          max_tokens: 512
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const reply = response.data.choices[0].message.content;

      res.json({ response: reply });

    } catch (err) {
      console.error("GROQ AI ERROR:", err);
      res.status(500).json({ message: "AI chat failed", error: err.message });
    }
  }