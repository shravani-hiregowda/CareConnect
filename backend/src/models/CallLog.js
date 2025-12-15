import mongoose from "mongoose";

const { Schema } = mongoose;

const CallLogSchema = new Schema({
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: "Patient" 
  },

  doctor: { type: String },

  type: { 
    type: String, 
    enum: ["video", "voice"] 
  },

  durationSec: { type: Number },

  startedAt: { type: Date },
  endedAt: { type: Date },

  metadata: { type: Schema.Types.Mixed },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("CallLog", CallLogSchema);
