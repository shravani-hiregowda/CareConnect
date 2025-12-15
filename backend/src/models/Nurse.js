import mongoose from "mongoose";

const { Schema } = mongoose;

const NurseSchema = new Schema({
  nurseId: { type: String, unique: true, index: true },

  fullName: { type: String },

  hospitalCode: { type: String },

  email: { 
    type: String, 
    index: true, 
    sparse: true 
  },

  phone: { type: String },

  passwordHash: { type: String },

  role: { 
    type: String, 
    default: "nurse" 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model("Nurse", NurseSchema);
