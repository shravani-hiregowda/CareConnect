import express from "express";
import bcrypt from "bcrypt";
import { signToken } from "../middleware/auth.js";
import Nurse from "../models/Nurse.js";
import Patient from "../models/Patient.js";

const router = express.Router();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT || "12", 10);

/* -----------------------------------------------------------
   NURSE REGISTRATION
   Body: { nurseId, fullName, hospitalCode, email, phone, password }
----------------------------------------------------------- */
router.post("/register/nurse", async (req, res) => {
  try {
    const { nurseId, fullName, hospitalCode, email, phone, password } = req.body;

    if (!nurseId || !password) {
      return res.status(400).json({ error: "nurseId and password required" });
    }

    const existing = await Nurse.findOne({ nurseId });
    if (existing) {
      return res.status(400).json({ error: "Nurse ID already exists" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const nurse = new Nurse({
      nurseId,
      fullName,
      hospitalCode,
      email,
      phone,
      passwordHash: hash,
    });

    await nurse.save();

    return res.json({
      ok: true,
      nurse: { nurseId: nurse.nurseId, fullName: nurse.fullName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------------------------
   NURSE LOGIN
   Body: { nurseId, hospitalCode, password }
----------------------------------------------------------- */
router.post("/login/nurse", async (req, res) => {
  try {
    const { nurseId, hospitalCode, password } = req.body;

    if (!nurseId || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const nurse = await Nurse.findOne({ nurseId, hospitalCode });
    if (!nurse) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, nurse.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(
      {
        id: nurse._id,
        nurseId: nurse.nurseId,
        role: "nurse",
      },
      "8h"
    );

    return res.json({
      ok: true,
      token,
      nurse: { nurseId: nurse.nurseId, fullName: nurse.fullName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------------------------
   PATIENT LOGIN
   Body: { patientId, password }
   (Password optional for hackathon — you are allowing free login)
----------------------------------------------------------- */
router.post("/login/patient", async (req, res) => {
  try {
    const { patientId, password } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Missing patientId" });
    }

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(401).json({ error: "Patient not found" });
    }

    // Hackathon mode — no password check needed
    const token = signToken(
      {
        id: patient._id,
        patientId: patient.patientId,
        role: "patient",
      },
      "8h"
    );

    return res.json({
      ok: true,
      token,
      patient: { patientId: patient.patientId, fullName: patient.fullName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
