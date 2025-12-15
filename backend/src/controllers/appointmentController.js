import Appointment from "../models/Appointment.js";

// ------------------------ Patient: Get all appointments ------------------------
export const getAppointments = async (req, res, next) => {
  try {
    const data = await Appointment.find({ patientId: req.user.id });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ------------------------ Patient: Book appointment ------------------------
export const bookAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      patientId: req.user.id,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
};

// ------------------------ Get Appointment by ID ------------------------
export const getAppointmentDetails = async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    res.json(appt);
  } catch (err) {
    next(err);
  }
};

// ------------------------ Update Appointment ------------------------
export const updateAppointment = async (req, res, next) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ------------------------ Delete Appointment ------------------------
export const deleteAppointment = async (req, res, next) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    next(err);
  }
};

// ------------------------ Nurse: Get ALL Appointments ------------------------
export const getAllAppointmentsForNurse = async (req, res, next) => {
  try {
    const data = await Appointment.find().populate("patientId");
    res.json(data);
  } catch (err) {
    next(err);
  }
};
