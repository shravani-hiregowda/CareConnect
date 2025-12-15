// src/models/PatientMemory.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PatientMemorySchema = new Schema(
  {
    // ************ CRITICAL FIX ************
    patientId: {
      type: String,        // MUST be string because LiveKit identity is a string
      required: true,
      unique: true
    },

    conversationHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        from: { type: String, enum: ["user", "doctor"] },
        message: String
      }
    ],

    symptomsTimeline: [
      {
        date: { type: Date, default: Date.now },
        symptom: String,        // FIX: singular symptom to match your memoryService
        severity: { type: Number, default: 0 }
      }
    ],

    medicalFacts: {
      allergies: [String],
      chronicConditions: [String],
      medications: [String],
      recentVitals: {
        bp: String,
        heartRate: String,
        oxygen: String
      }
    },

    longTermSummary: { type: String, default: "" },
    lastRecommendation: { type: String, default: "" },

    riskScore: { type: Number, default: 0 },
    lastConversation: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("PatientMemory", PatientMemorySchema);
