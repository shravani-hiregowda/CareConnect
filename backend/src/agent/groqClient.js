// src/agent/groqClient.js
// Lightweight Groq client wrapper for your backend.
// Exports a default client instance or null if API key is missing.

import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

let groqClient = null;

if (!apiKey) {
  console.warn("⚠ GROQ_API_KEY missing — Groq LLM features disabled.");
} else {
  try {
    groqClient = new Groq({ apiKey });
  } catch (err) {
    console.error("Failed to construct Groq client:", err);
    groqClient = null;
  }
}

export default groqClient;
