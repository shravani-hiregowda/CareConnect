import mongoose from "mongoose";

const { Schema } = mongoose;

const AppointmentSchema = new Schema({
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: "Patient", 
    index: true, 
    required: true 
  },

  doctorName: { type: String },
  department: { type: String },

  date: { type: Date },
  time: { type: String },

  status: { 
    type: String, 
    enum: ["confirmed", "pending", "cancelled"], 
    default: "pending" 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Appointment", AppointmentSchema);
