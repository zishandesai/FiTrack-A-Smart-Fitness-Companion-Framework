import mongoose from "mongoose";

const exerciseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  completed: { type: Boolean, default: false },
});

const workoutSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      default: "Chest + Triceps",
    },
    exercises: [exerciseItemSchema],
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed"],
      default: "assigned",
    },
  },
  {
    timestamps: true,
  }
);

const Workout = mongoose.model("Workout", workoutSchema);
export default Workout;
