// src/app.js (ESM)
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorMiddleware from "./middleware/error.js";
import schedulerService from "./services/schedulerService.js";
import env from "./config/env.js"; // OK to keep
import agentRoutes from "./routes/agentRoutes.js";
import ttsRoutes from "./routes/ttsRoutes.js";

// -------------------------
// MUST import path utilities BEFORE dotenv
// -------------------------
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------
// 🔥 Load .env properly (CRUCIAL FIX)
// -------------------------
import dotenv from "dotenv";
dotenv.config({
  path: path.join(__dirname, "../../.env"), // Correct absolute path
});

// Debug LiveKit env variables
console.log("🔍 LIVEKIT_API_KEY =", process.env.LIVEKIT_API_KEY);
console.log("🔍 LIVEKIT_API_SECRET =", process.env.LIVEKIT_API_SECRET);
console.log("🔍 LIVEKIT_URL =", process.env.LIVEKIT_URL);

// -------------------------
// Route imports
// -------------------------
import patientRoutes from "./routes/patientRoutes.js";
import nurseRoutes from "./routes/nurseRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import medicationRoutes from "./routes/medicationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import livekitRoutes from "./routes/livekitRoutes.js";
import frontendRoutes from "./routes/frontendRoutes.js";

const app = express();

/* ----------------------- DATABASE ----------------------- */
await connectDB();

/* ---------------------- MIDDLEWARE ---------------------- */
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* ----------------------------------------------------------
   STATIC FRONTEND PATHS — EXACT MATCH TO YOUR PROJECT
----------------------------------------------------------- */

const ROOT = path.join(__dirname, "../../");  // CareConnect/
const FRONTEND = path.join(ROOT, "frontend"); // CareConnect/frontend

// Serve frontend static assets
app.use("/api/tts", ttsRoutes);
app.use("/frontend/static", express.static(path.join(FRONTEND, "static")));
app.use("/frontend/templates", express.static(path.join(FRONTEND, "templates")));
app.use("/frontend/node_modules", express.static(path.join(FRONTEND, "node_modules")));

console.log("📁 Frontend Static =", path.join(FRONTEND, "static"));
console.log("📁 Frontend Templates =", path.join(FRONTEND, "templates"));
console.log("📁 Frontend Node Modules =", path.join(FRONTEND, "node_modules"));

/* ---------------------- HEALTH CHECK ---------------------- */
app.get("/ping", (req, res) => {
  res.json({ message: "CareConnect Backend Running 🚀" });
});

/* ------------------------- API ROUTES ------------------------- */
app.use("/api/agent", agentRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/nurse", nurseRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// LiveKit token creation
app.use("/api/livekit", livekitRoutes);

// Frontend pages
app.use("/", frontendRoutes);

/* ---------------------- ERROR HANDLER ---------------------- */
app.use(errorMiddleware);

/* ---------------------- SCHEDULERS INIT ---------------------- */
if (schedulerService?.initSchedulers) {
  schedulerService.initSchedulers();
}

export default app;
