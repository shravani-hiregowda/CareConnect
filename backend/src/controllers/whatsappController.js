import whatsappService from "../services/whatsappService.js";
import n8nService from "../services/n8nService.js";
import Patient from "../models/Patient.js";

// ---------------------------------- VERIFY WEBHOOK ----------------------------------
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
};

// ---------------------------------- HANDLE INCOMING MESSAGE ----------------------------------
export const handleIncomingMessage = async (req, res) => {
  try {
    const data = req.body;

    const from = data.entry[0]?.changes[0]?.value?.messages?.[0]?.from;
    const msg = data.entry[0]?.changes[0]?.value?.messages?.[0]?.text?.body;

    if (!from || !msg) return res.sendStatus(200);

    // Forward to N8N automation pipeline
    await n8nService.forwardIncomingMessage(from, msg);

    res.sendStatus(200);
  } catch (err) {
    console.log("Webhook error:", err);
    res.sendStatus(500);
  }
};

// ---------------------------------- SEND OUTGOING WHATSAPP MESSAGE ----------------------------------
export const sendWhatsAppMessage = async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    await whatsappService.sendMessage(phone, message);

    res.json({ message: "Sent!" });
  } catch (err) {
    next(err);
  }
};
