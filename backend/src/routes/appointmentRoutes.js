import express from "express";
import {
  getAppointments,
  bookAppointment,
  getAppointmentDetails,
  updateAppointment,
  deleteAppointment,
  getAllAppointmentsForNurse
} from "../controllers/appointmentController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// ------------------------- Patient Routes -------------------------
router.get("/", auth, getAppointments);
router.post("/", auth, bookAppointment);
router.get("/:id", auth, getAppointmentDetails);
router.put("/:id", auth, updateAppointment);
router.delete("/:id", auth, deleteAppointment);

// ------------------------- Nurse Routes ----------------------------
router.get("/nurse/all", auth, getAllAppointmentsForNurse);

export default router;
