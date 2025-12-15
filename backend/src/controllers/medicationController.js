import Medication from "../models/Medication.js";

// ---------------------- Get All Medications ----------------------
export const getMedications = async (req, res, next) => {
  try {
    const meds = await Medication.find({ patientId: req.user.id });
    res.json(meds);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Add Medication ----------------------
export const addMedication = async (req, res, next) => {
  try {
    const med = await Medication.create({
      ...req.body,
      patientId: req.user.id,
    });

    res.status(201).json(med);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Get Medication By ID ----------------------
export const getMedicationDetails = async (req, res, next) => {
  try {
    const med = await Medication.findById(req.params.id);
    res.json(med);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Update Medication ----------------------
export const updateMedication = async (req, res, next) => {
  try {
    const med = await Medication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(med);
  } catch (err) {
    next(err);
  }
};

// ---------------------- Delete Medication ----------------------
export const deleteMedication = async (req, res, next) => {
  try {
    await Medication.findByIdAndDelete(req.params.id);
    res.json({ message: "Medication removed" });
  } catch (err) {
    next(err);
  }
};
