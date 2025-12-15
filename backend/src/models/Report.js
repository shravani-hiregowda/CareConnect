import mongoose from "mongoose";

const { Schema } = mongoose;

const ReportSchema = new Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },

  title: { type: String },
  description: { type: String },
  doctorName: { type: String },
  date: { type: Date },

  fileUrl: { type: String },
  extractedText: { type: String },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Report", ReportSchema);
