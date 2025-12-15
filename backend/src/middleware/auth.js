import jwt from "jsonwebtoken";
import Nurse from "../models/Nurse.js";
import Patient from "../models/Patient.js";

/* ------------------------------------------------------
   MAIN AUTH MIDDLEWARE (DEFAULT + NAMED EXPORT)
------------------------------------------------------ */
export function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// ⭐ DEFAULT EXPORT FOR BACKWARD COMPATIBILITY
export default auth;

/* ------------------------------------------------------
   NURSE ONLY
------------------------------------------------------ */
export async function nurseOnly(req, res, next) {
  try {
    const user = await Nurse.findById(req.user.id);
    if (!user)
      return res.status(403).json({ message: "Nurse access required" });

    next();
  } catch (err) {
    return res.status(403).json({ message: "Unauthorized role" });
  }
}

/* ------------------------------------------------------
   PATIENT ONLY
------------------------------------------------------ */
export async function patientOnly(req, res, next) {
  try {
    const user = await Patient.findById(req.user.id);
    if (!user)
      return res.status(403).json({ message: "Patient access required" });

    next();
  } catch (err) {
    return res.status(403).json({ message: "Unauthorized role" });
  }
}
