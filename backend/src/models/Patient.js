import mongoose from "mongoose";

const { Schema } = mongoose;

const PatientSchema = new Schema(
  {
    patientId: {
      type: String,
      unique: true,
      index: true,
      required: true
    },

    // ---------- Personal Info ----------
    patientName: { type: String },
    age: { type: Number },
    gender: { type: String },

    hospitalCode: { type: String },
    primaryPhysician: { type: String },

    // ---------- Dates ----------
    admissionDate: { type: Date },
    dischargeDate: { type: Date },
    surgeryDate: { type: Date },

    // ---------- Diagnosis & Treatment ----------
    primaryDiagnosis: { type: String },
    secondaryNotes: { type: String },
    procedure: { type: String },
    complications: { type: String },
    treatmentSummary: { type: String },

    // ---------- Vitals ----------
    temperature: { type: String },
    heartRate: { type: String },
    bloodPressure: { type: String },
    oxygenSaturation: { type: String },
    respiratoryRate: { type: String },

    // ---------- Discharge ----------
    dischargeMeds: { type: String },
    followUpPlan: { type: String },
    homeCare: { type: String },

    // ---------- Emergency ----------
    emergencyContacts: { type: String },

    // ---------- Relations ----------
      medications: [
      {
        name: String,
        dose: String,
        schedule: {
          morning: Boolean,
          afternoon: Boolean,
          night: Boolean
        },
        notes: String
      }
    ],


    appointments: [{ type: Schema.Types.ObjectId, ref: "Appointment" }],
    reports: [{ type: Schema.Types.ObjectId, ref: "Report" }],

    // ---------- Check-In History ----------
    checkInHistory: [
      {
        date: { type: Date, default: Date.now },
        symptoms: [String],
        riskScore: { type: Number, default: 0 },
        notes: String,
        submittedVia: {
          type: String,
          enum: ["WhatsApp", "Dashboard", "MobileApp", "NurseEntry"],
          default: "Dashboard"
        }
      }
    ],

    // ---------- Default Recovery Status ----------
    recoveryStatus: {
      type: String,
      enum: ["Good", "Moderate", "Needs Attention", "Critical"],
      default: "Moderate"
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
  },
  { timestamps: true }
);

// Auto-update timestamp
PatientSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Patient", PatientSchema);
