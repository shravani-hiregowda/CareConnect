import express from "express";
import { getChatHistory, askAI } from "../controllers/chatController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Chat history
router.get("/history", auth, getChatHistory);

// Ask AI
router.post("/ask", auth, askAI);

export default router;
