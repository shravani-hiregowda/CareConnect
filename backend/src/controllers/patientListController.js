import Patient from "../models/Patient.js";

export const getPatientLists = async (req, res) => {
    try {
        const good = await Patient.find({ recoveryStatus: "Good" });
        const moderate = await Patient.find({ recoveryStatus: "Moderate" });
        const alert = await Patient.find({ recoveryStatus: "Critical" });

        res.json({
            good,
            moderate,
            alert
        });
    } catch (err) {
        console.error("patients-lists error:", err);
        res.status(500).json({ message: "Failed to load patient lists" });
    }
};

