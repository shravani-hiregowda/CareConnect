import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      unique: true
    },
    emailNotifications: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    autoLogout: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    dataEncryption: { type: Boolean, default: true },
    autoSaveForms: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Settings", SettingsSchema);
