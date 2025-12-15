import cron from "node-cron";
import Patient from "../models/Patient.js";
import whatsappService from "./whatsappService.js";
import n8nService from "./n8nService.js";

const schedulerService = {
  initSchedulers() {
    console.log("📅 Schedulers initialized");

    // -------------------- DAILY CHECK-IN (9 AM) --------------------
    cron.schedule("0 9 * * *", async () => {
      try {
        const patients = await Patient.find();

        for (const p of patients) {
          if (p.phone) {
            await whatsappService.sendMessage(
              p.phone,
              "Good morning! Please share how you're feeling today."
            );

            await n8nService.triggerWorkflow("daily-checkin", {
              patientId: p._id,
            });
          }
        }
      } catch (err) {
        console.error("Scheduler 9AM Error:", err.message);
      }
    });

    // -------------------- MEDICATION REMINDER (7 PM) --------------------
    cron.schedule("0 19 * * *", async () => {
      try {
        const patients = await Patient.find();

        for (const p of patients) {
          if (p.phone) {
            await whatsappService.sendMessage(
              p.phone,
              "⏰ Reminder: Please take your scheduled medications."
            );
          }
        }
      } catch (err) {
        console.error("Scheduler 7PM Error:", err.message);
      }
    });
  }
};

export default schedulerService;
