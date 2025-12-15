import express from "express";
import { generateLivekitToken } from "../services/livekitService.js";

const router = express.Router();

router.get("/session", async (req, res) => {
  try {
    const identity = req.query.identity || `user-${Date.now()}`;
    const room = "virtual-doctor-room";

    console.log("🎯 Route Identity =", identity);

    const token = await generateLivekitToken(identity, room);

    return res.json({
      success: true,
      token: token,  // real JWT, not {}
      identity,
      room,
      livekitUrl: process.env.LIVEKIT_URL,
    });

  } catch (err) {
    console.error("❌ LiveKit token error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
