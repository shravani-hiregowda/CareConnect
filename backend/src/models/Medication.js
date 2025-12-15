import mongoose from "mongoose";

const { Schema } = mongoose;

const MedicationSchema = new Schema({
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: "Patient", 
    index: true, 
    required: true 
  },

  name: { type: String },

  dosage: { type: String },

  frequency: { type: String },

  reminderTimes: [String], // e.g., ["08:00", "20:00"]

  startDate: { type: Date },

  endDate: { type: Date },

  instructions: { type: String },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Medication", MedicationSchema);
