import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  userId: String,
  messages: [
    {
      from: String, // "user" | "doctor"
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  extracted: {
    symptoms: [String],
    conditions: [String],
    medications: [String],
    notes: String
  }
});

export default mongoose.model("Conversation", ConversationSchema);
