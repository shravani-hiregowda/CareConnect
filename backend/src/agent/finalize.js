// Add inside src/routes/agentRoutes.js

import AgentService from "../services/agentService.js";

router.post("/finalize", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }

    const summary = await AgentService.finalizeCall(userId);

    return res.json({
      success: true,
      summary: summary || "No summary generated"
    });
  } catch (err) {
    console.error("Finalize error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to finalize call",
      error: err?.message
    });
  }
});
