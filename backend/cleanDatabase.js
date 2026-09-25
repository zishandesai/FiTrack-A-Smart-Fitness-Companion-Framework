import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import User from "./models/User.js";
import Membership from "./models/Membership.js";
import Workout from "./models/Workout.js";
import Attendance from "./models/Attendance.js";
import AIAnalysis from "./models/AIAnalysis.js";
import Progress from "./models/Progress.js";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const cleanDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("[FIT-TRACK Clean] MONGODB_URI not found in .env");
      process.exit(1);
    }

    console.log("[FIT-TRACK Clean] Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log(`[FIT-TRACK Clean] Connected to database: ${mongoose.connection.name}`);

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@fittrack.com").replace(/['"]/g, "").toLowerCase().trim();

    // Remove all users except the Master Admin
    const result = await User.deleteMany({ email: { $ne: adminEmail } });
    console.log(`[FIT-TRACK Clean] ✓ Removed ${result.deletedCount} test accounts (trainers & members).`);

    // Clean test memberships, workouts, attendance, and AI records
    await Membership.deleteMany({});
    await Workout.deleteMany({});
    await Attendance.deleteMany({});
    await AIAnalysis.deleteMany({});
    await Progress.deleteMany({});
    console.log("[FIT-TRACK Clean] ✓ Reset memberships, workouts, attendance, and AI analysis records.");

    // Verify master admin exists
    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.log(`[FIT-TRACK Clean] Seeding fresh Master Admin (${adminEmail})...`);
      const masterAdmin = new User({
        name: (process.env.ADMIN_NAME || "Gym Administrator").replace(/['"]/g, "").trim(),
        email: adminEmail,
        password: (process.env.ADMIN_PASSWORD || "Admin@12345").replace(/['"]/g, "").trim(),
        role: "admin",
        isImmutableAdmin: true,
        goal: "General Fitness",
      });
      await masterAdmin.save();
      console.log(`[FIT-TRACK Clean] ✓ Master Admin seeded: ${adminEmail}`);
    } else {
      admin.role = "admin";
      admin.isImmutableAdmin = true;
      await admin.save();
      console.log(`[FIT-TRACK Clean] ✓ Master Admin preserved: ${adminEmail}`);
    }

    const adminCount = await User.countDocuments({ role: "admin" });
    const trainerCount = await User.countDocuments({ role: "trainer" });
    const memberCount = await User.countDocuments({ role: "member" });

    console.log("=======================================================");
    console.log(`🎉 DB Reset Complete! Current Population:`);
    console.log(`   👑 Admin:    ${adminCount}`);
    console.log(`   🏋️ Trainers: ${trainerCount}`);
    console.log(`   🧑 Members:  ${memberCount}`);
    console.log(`Now your gym starts completely fresh for your demo!`);
    console.log("=======================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[FIT-TRACK Clean Error]:", error.message);
    process.exit(1);
  }
};

cleanDatabase();
