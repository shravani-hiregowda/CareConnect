import ChatMessage from "../models/ChatMessage.js";
import { getAIResponse } from "../services/aiService.js";
import { sendCriticalAlert } from "../services/alertService.js";

// ---------------------- Get Chat History ----------------------
export const getChatHistory = async (req, res, next) => {
  try {
    const history = await ChatMessage.find({ patientId: req.user.id });
    res.json(history);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Ask AI ----------------------
export const askAI = async (req, res, next) => {
  try {
    const { message } = req.body;

    // Save user message
    await ChatMessage.create({
      patientId: req.user.id,
      sender: "user",
      message,
    });

    // Get AI reply
    const aiReply = await getAIResponse(message);

    // Save AI message
    await ChatMessage.create({
      patientId: req.user.id,
      sender: "ai",
      message: aiReply.text,
      riskLevel: aiReply.risk,
    });

    // Critical → Notify nurse
    if (aiReply.risk === "critical") {
      await sendCriticalAlert(req.user.id, message);
    }

    res.json({ response: aiReply });
  } catch (err) {
    next(err);
  }
};
