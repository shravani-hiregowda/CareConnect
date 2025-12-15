import express from "express";
import {
  getNotifications,
  markAllAsRead,
  markAsRead
} from "../controllers/notificationController.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// Routes
router.get("/", auth, getNotifications);
router.put("/mark-all-read", auth, markAllAsRead);
router.put("/:id/mark-read", auth, markAsRead);

export default router;
