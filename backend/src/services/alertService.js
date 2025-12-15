import Patient from "../models/Patient.js";
import whatsappService from "./whatsappService.js";
import n8nService from "./n8nService.js";

export async function sendCriticalAlert(patientId, message) {
  try {
    const patient = await Patient.findById(patientId).populate("assignedNurse");
    if (!patient || !patient.assignedNurse) return;

    const nurse = patient.assignedNurse;

    const alertMsg = `⚠️ CRITICAL ALERT\n\nPatient: ${patient.fullName}\nIssue: ${message}`;

    // WhatsApp message
    if (nurse.phone) {
      await whatsappService.sendMessage(nurse.phone, alertMsg);
    }

    // n8n workflow
    await n8nService.sendAlertToNurse(nurse._id, patient._id, message);
  } catch (err) {
    console.error("Critical Alert Error:", err.message);
  }
}

// Optional default export
export default {
  sendCriticalAlert
};
