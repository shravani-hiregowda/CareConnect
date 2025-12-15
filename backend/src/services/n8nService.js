import axios from "axios";

const n8nBase = process.env.N8N_WEBHOOK_URL;

const n8nService = {
  // Send ANY event to n8n workflow
  async triggerWorkflow(eventName, payload) {
    try {
      await axios.post(`${n8nBase}/${eventName}`, payload);
      return true;
    } catch (err) {
      console.error("N8N Error:", err.message);
      return false;
    }
  },

  // Incoming WhatsApp → Forward to N8N
  async forwardIncomingMessage(phone, message) {
    try {
      await axios.post(`${n8nBase}/incoming-whatsapp`, {
        phone,
        message,
      });
    } catch (err) {
      console.error("N8N Forward Error:", err.message);
    }
  },

  // Trigger nurse alert workflow
  async sendAlertToNurse(nurseId, patientId, text) {
    try {
      await axios.post(`${n8nBase}/alert-nurse`, {
        nurseId,
        patientId,
        text,
      });
    } catch (err) {
      console.error("N8N Alert Error:", err.message);
    }
  }
};

export default n8nService;
