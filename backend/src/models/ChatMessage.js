import mongoose from "mongoose";

const { Schema } = mongoose;

const ChatMessageSchema = new Schema({
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: "Patient" 
  },

  sender: { 
    type: String, 
    enum: ["user", "ai", "nurse"] 
  },

  message: { type: String },

  timestamp: { 
    type: Date, 
    default: Date.now 
  },

  riskLevel: { 
    type: String, 
    enum: ["normal", "warning", "critical"], 
    default: "normal" 
  }
});

export default mongoose.model("ChatMessage", ChatMessageSchema);
