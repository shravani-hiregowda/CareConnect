import express from "express";
import {
    getReports,
    uploadReport,
    getReportDetails,
    deleteReport
} from "../controllers/reportController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// ---------------- Reports ----------------
router.get("/", auth, getReports);
router.post("/", auth, uploadReport);
router.get("/:id", auth, getReportDetails);
router.delete("/:id", auth, deleteReport);

export default router;
