import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    workoutCount: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
    formScore: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index({ memberId: 1, date: -1 });

const Progress = mongoose.model("Progress", progressSchema);
export default Progress;
