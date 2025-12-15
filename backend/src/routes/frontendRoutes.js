import express from "express";
const router = express.Router();

router.get("/video-call", (req, res) => {
    res.sendFile("video-call.html", { root: "frontend/templates" });
});

export default router;
