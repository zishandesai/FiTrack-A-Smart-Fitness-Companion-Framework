import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exercise: {
      type: String,
      required: true,
      enum: ["Squat", "Push-up", "Bicep Curl", "Deadlift", "Bench Press", "General"],
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    correctRepetitions: {
      type: Number,
      default: 0,
    },
    incorrectRepetitions: {
      type: Number,
      default: 0,
    },
    formScore: {
      type: Number,
      default: 0,
    },
    mistakes: [
      {
        type: String,
      },
    ],
    feedback: [
      {
        type: String,
      },
    ],
    llmAssessment: {
      type: String,
      default: "",
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

const AIAnalysis = mongoose.model("AIAnalysis", aiAnalysisSchema);
export default AIAnalysis;
