import express from "express";
import {
  getMedications,
  addMedication,
  getMedicationDetails,
  updateMedication,
  deleteMedication
} from "../controllers/medicationController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// Routes
router.get("/", auth, getMedications);
router.post("/", auth, addMedication);
router.get("/:id", auth, getMedicationDetails);
router.put("/:id", auth, updateMedication);
router.delete("/:id", auth, deleteMedication);

export default router;
