import Notification from "../models/Notification.js";

// ---------------------- Get All Notifications ----------------------
export const getNotifications = async (req, res, next) => {
  try {
    const data = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Mark ALL as Read ----------------------
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id },
      { $set: { isRead: true } }
    );

    res.json({ message: "All marked as read" });
  } catch (err) {
    next(err);
  }
};

// ---------------------- Mark Single Notification as Read ----------------------
export const markAsRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

