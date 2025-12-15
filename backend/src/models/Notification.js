import mongoose from "mongoose";

const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },

  userType: { 
    type: String, 
    enum: ["patient", "nurse", "admin"], 
    required: true 
  },

  type: { type: String }, // alert, warning, success, info...

  title: { type: String },

  message: { type: String },

  data: { type: Schema.Types.Mixed }, // extra metadata

  isRead: { 
    type: Boolean, 
    default: false 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Notification", NotificationSchema);
