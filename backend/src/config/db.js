import mongoose from "mongoose";
import { MONGO_URI } from "./env.js";

export default async function connectDB() {
  try {
    if (!MONGO_URI) {
      console.error("❌ MongoDB URI missing in .env");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, {
      // Modern Mongoose no longer needs useNewUrlParser or useUnifiedTopology
    });

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
}
