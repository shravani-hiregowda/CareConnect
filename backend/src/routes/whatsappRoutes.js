import express from "express";
import {
    verifyWebhook,
    handleIncomingMessage,
    sendWhatsAppMessage
} from "../controllers/whatsappController.js";

const router = express.Router();

// WhatsApp webhook (public)
router.get("/webhook", verifyWebhook);
router.post("/webhook", handleIncomingMessage);

// Trigger outgoing messages
router.post("/send", sendWhatsAppMessage);

export default router;
