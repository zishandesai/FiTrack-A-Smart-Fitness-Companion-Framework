import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "present",
    },
    checkInTime: {
      type: String,
      default: () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    method: {
      type: String,
      enum: ["turnstile", "qr_code", "manual"],
      default: "manual",
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ memberId: 1, date: -1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
