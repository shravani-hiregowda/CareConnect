import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const MONGO_URI = process.env.MONGO_URI;

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// WhatsApp Cloud API
export const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
export const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export const NODE_ENV = process.env.NODE_ENV || "development";

export default {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  OPENAI_API_KEY,
  N8N_WEBHOOK_URL,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_ID,
  NODE_ENV
};
