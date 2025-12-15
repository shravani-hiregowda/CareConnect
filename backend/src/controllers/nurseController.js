import Nurse from "../models/Nurse.js";
import Patient from "../models/Patient.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import generateId from "../utils/generateId.js";

// ---------------- REGISTER NURSE ----------------
export const registerNurse = async (req, res, next) => {
  try {
    const { fullName, nurseId, hospitalCode, email, phone, password } = req.body;

    const exists = await Nurse.findOne({ nurseId, hospitalCode });
    if (exists)
      return res.status(400).json({ message: "Nurse already exists" });

    const hash = await bcrypt.hash(password, 10);

    const nurse = await Nurse.create({
      fullName,
      nurseId,
      hospitalCode,
      email,
      phone,
      passwordHash: hash,
    });

    res.status(201).json({ message: "Nurse registered", nurse });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGIN NURSE ----------------
export const loginNurse = async (req, res, next) => {
  try {
    const { nurseId, hospitalCode, password } = req.body;

    const nurse = await Nurse.findOne({ nurseId, hospitalCode });
    if (!nurse)
      return res.status(404).json({ message: "Nurse not found" });

    const valid = await bcrypt.compare(password, nurse.passwordHash);
    if (!valid)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: nurse._id, role: "nurse" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token, nurse });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET PROFILE ----------------
export const getProfile = async (req, res, next) => {
  try {
    const nurse = await Nurse.findById(req.user.id).select("-passwordHash");
    res.json(nurse);
  } catch (err) {
    next(err);
  }
};

// ---------------- ASSIGNED PATIENTS ----------------
export const getAssignedPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ assignedNurse: req.user.id });
    res.json(patients);
  } catch (err) {
    next(err);
  }
};

// ---------------- ASSIGN PATIENT TO NURSE ----------------
export const assignPatientToNurse = async (req, res, next) => {
  try {
    const { patientId } = req.body;

    await Patient.findByIdAndUpdate(patientId, {
      assignedNurse: req.user.id,
    });

    res.json({ message: "Patient assigned to nurse" });
  } catch (err) {
    next(err);
  }
};
