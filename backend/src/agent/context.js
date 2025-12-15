// src/agent/context.js
import Patient from "../models/Patient.js";

export async function buildPatientContext(patientId) {
  const p = await Patient.findOne({ patientId }).lean();

  if (!p) return "NO PATIENT DATA FOUND";

  const last = p.checkInHistory?.slice(-1)[0] || {};

  // ALWAYS return plain string
  return `
PATIENT NAME: ${p.patientName || "unknown"}
AGE: ${p.age || "unknown"}
GENDER: ${p.gender || "unknown"}

PRIMARY DIAGNOSIS: ${p.primaryDiagnosis || "unknown"}
SECONDARY NOTES: ${p.secondaryNotes || "none"}

LAST SURGERY DATE: ${p.surgeryDate || "none"}
COMPLICATIONS: ${p.complications || "none"}

LATEST VITALS:
- BP: ${p.bloodPressure || "N/A"}
- HR: ${p.heartRate || "N/A"}
- SPO2: ${p.oxygenSaturation || "N/A"}
- TEMP: ${p.temperature || "N/A"}
- RESP RATE: ${p.respiratoryRate || "N/A"}

DISCHARGE MEDICATIONS:
${p.dischargeMeds || "none"}

FOLLOW-UP PLAN:
${p.followUpPlan || "none"}

LAST CHECK-IN:
DATE: ${last.date || "none"}
SYMPTOMS: ${last.symptoms?.join(", ") || "none"}
NOTES: ${last.notes || "none"}
RISK SCORE: ${last.riskScore || 0}

CONTEXT COMPLETE. DO NOT ASK FOR NAME OR HISTORY.
`;
}
