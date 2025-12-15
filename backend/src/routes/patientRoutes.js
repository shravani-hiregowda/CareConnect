import express from "express";

import {
  loginPatient,
  getProfile,
  updateProfile,
  getDashboardData,
  extractAI,
  createPatientByNurse,
  chatWithPatientAI 
} from "../controllers/patientController.js";

import { auth, nurseOnly, patientOnly } from "../middleware/auth.js";

const router = express.Router();

/* ---------------- PATIENT REGISTRATION ---------------- */
router.post("/register", auth, nurseOnly, createPatientByNurse);

/* ---------------- PATIENT LOGIN ---------------- */
router.post("/login", loginPatient);

/* ---------------- PROFILE ROUTES ---------------- */
router.get("/profile", auth, patientOnly, getProfile);
router.put("/profile", auth, patientOnly, updateProfile);

/* ---------------- DASHBOARD ---------------- */
router.get("/dashboard", auth, patientOnly, getDashboardData);

/* ---------------- AI EXTRACTION ---------------- */
router.post("/extract-ai", auth, nurseOnly, extractAI);
router.post("/chat", auth, patientOnly, chatWithPatientAI);

export default router;
