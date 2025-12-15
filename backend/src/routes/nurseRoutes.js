import express from "express";
import {
  registerNurse,
  loginNurse,
  getProfile,
  getAssignedPatients,
  assignPatientToNurse
} from "../controllers/nurseController.js";

import { auth, nurseOnly } from "../middleware/auth.js";
import { getNurseStats } from "../controllers/statsController.js";

const router = express.Router();

// Public routes
router.post("/signup", registerNurse);
router.post("/login", loginNurse);

// Protected nurse routes
router.get("/profile", auth, nurseOnly, getProfile);
router.get("/assigned-patients", auth, nurseOnly, getAssignedPatients);
router.post("/assign-patient", auth, nurseOnly, assignPatientToNurse);
router.get("/stats", auth, nurseOnly, getNurseStats);

export default router;
