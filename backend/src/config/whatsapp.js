import axios from "axios";
import {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_ID
} from "./env.js";

if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
  console.warn("⚠️ WhatsApp API environment variables missing");
}

const api = axios.create({
  baseURL: `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/`,
  headers: {
    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export default api;
