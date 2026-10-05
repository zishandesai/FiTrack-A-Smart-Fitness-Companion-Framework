import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Database & Seed Initializer
import { connectDB } from "./config/db.js";
import { seedMasterAdmin } from "./config/seedAdmin.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

// Generous limit for multimodal base64 webcam frames
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/requests", requestRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "FIT-TRACK REST API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("FIT-TRACK Smart Fitness Companion API is running.");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[FIT-TRACK Server Error]:", err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

// Start Server & Connect Database
const startServer = async () => {
  const dbConnected = await connectDB();

  if (dbConnected) {
    await seedMasterAdmin();
  } else {
    console.log("[FIT-TRACK Server] Running with offline/local fallback support.");
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏋️ FIT-TRACK Backend REST API Online on port ${PORT}`);
    console.log(`👉 Health: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI NutriCoach & Pose Vision Endpoints Ready`);
    console.log(`👑 Root Admin: ${process.env.ADMIN_EMAIL || "admin@fittrack.com"}`);
    console.log(`=======================================================`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n⚠️  [FIT-TRACK Notice] Port ${PORT} is already in use by a running instance.`);
      console.error(`💡 The backend server is already actively running on port ${PORT}.\n`);
      process.exit(0);
    } else {
      console.error("[FIT-TRACK Server Error]:", err);
    }
  });
};

startServer();
