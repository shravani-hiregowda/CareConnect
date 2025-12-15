import Patient from "../models/Patient.js";

// GET /api/nurse/stats
export const getNurseStats = async (req, res) => {
    try {
        // 1. Total patients
        const totalPatients = await Patient.countDocuments();

        // 2. Recovery categories
        const goodCount = await Patient.countDocuments({ recoveryStatus: "Good" });
        const moderateCount = await Patient.countDocuments({ recoveryStatus: "Moderate" });
        const alertCount = await Patient.countDocuments({ recoveryStatus: "Needs Attention" });

        // 3. Completed followups → placeholder for now
        const completedFollowups = 0;

        // 4. Monthly patient additions
        const monthly = await Patient.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        return res.json({
            totalPatients,
            goodCount,
            moderateCount,
            alertCount,
            completedFollowups,
            monthly
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Failed to generate stats." });
    }
};
