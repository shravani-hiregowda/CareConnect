import express from "express";
import { generateTTS } from "../controllers/ttsController.js";

const router = express.Router();

router.post("/", generateTTS);

export default router;
