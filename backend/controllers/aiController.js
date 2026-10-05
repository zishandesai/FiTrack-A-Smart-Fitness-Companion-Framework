import { chatWithNutriCoach, analyzePoseVision, analyzeFoodVision } from "../services/aiService.js";
import { chatWithLangChain, extractUserTelemetry } from "../services/langchainService.js";
import AIAnalysis from "../models/AIAnalysis.js";
import User from "../models/User.js";
import Workout from "../models/Workout.js";
import Membership from "../models/Membership.js";
import Progress from "../models/Progress.js";

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with FitTrack NutriCoach AI (LangChain Tools, Multimodal Food Vision, Full Context)
 * @access  Public or Authenticated Member/Trainer
 */
export const chatWithAI = async (req, res) => {
  try {
    const { message = "", history = [], clientContext = {}, imageBase64 = null } = req.body;

    if ((!message || message.trim() === "") && !imageBase64) {
      return res.status(400).json({ success: false, message: "Please provide a question or upload a food photo for the AI coach." });
    }

    let member = null;
    let trainer = null;
    let membership = null;
    let workout = null;
    let progress = null;

    if (req.user) {
      // Fetch fresh member record with populated trainer
      member = await User.findById(req.user._id).select("-password").populate("trainerId", "name email phone specialty experience");

      if (member) {
        if (member.trainerId) {
          trainer = member.trainerId;
        }

        // Fetch member's latest active membership
        membership = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });

        // Fetch member's latest assigned workout split
        workout = await Workout.findOne({ memberId: member._id }).sort({ createdAt: -1 });

        // Fetch member's latest biometric progress record
        progress = await Progress.findOne({ memberId: member._id }).sort({ date: -1 });
      }
    }

    // Merge clientContext if passed from frontend session (e.g. offline fallback / optimistic cache)
    if (!member && clientContext.name) {
      member = {
        name: clientContext.name,
        email: clientContext.email,
        role: clientContext.role || "member",
        age: clientContext.age || 21,
        height: clientContext.height || 175,
        weight: clientContext.weight || 70,
        goal: clientContext.goal || "General Fitness",
        attendance: clientContext.attendance || 75,
        workoutsCount: clientContext.workoutsCount || 0,
        formScore: clientContext.formScore || 90,
      };
      if (clientContext.trainer || clientContext.trainerName) {
        trainer = {
          name: clientContext.trainerName || clientContext.trainer,
          specialty: clientContext.trainerSpecialty || "Strength & Hypertrophy",
          experience: "3+ years",
        };
      }
      if (clientContext.membership || clientContext.plan) {
        membership = {
          plan: clientContext.membership || clientContext.plan || "PRO",
          status: "active",
        };
      }
    }

    const userContext = {
      member,
      trainer,
      membership,
      workout,
      progress,
    };

    // If an image was provided, route to Multimodal Food Vision Analyzer
    if (imageBase64) {
      const visionResponse = await analyzeFoodVision({
        imageBase64,
        question: message,
        history,
        userContext,
      });

      return res.json({
        success: true,
        reply: visionResponse.reply,
        foodData: visionResponse.foodData,
        toolUsed: "analyzeFoodNutritionVision",
        toolData: visionResponse.foodData,
        source: visionResponse.source,
        telemetry: extractUserTelemetry(userContext),
      });
    }

    // Invoke LangChain Agent with dynamic tools and complete context
    const aiResponse = await chatWithLangChain({
      message,
      history,
      userContext,
    });

    res.json({
      success: true,
      ...aiResponse,
      telemetry: aiResponse.telemetry || extractUserTelemetry(userContext),
    });
  } catch (error) {
    console.error("[AI Chat Controller Error]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/ai/analyze-pose
 * @desc    Multimodal LLM analysis of webcam exercise frame
 * @access  Private
 */
export const analyzeExerciseFrame = async (req, res) => {
  try {
    const {
      imageBase64,
      exercise = "Squat",
      repetitions = 0,
      formScore,
      motionDetected = true,
      movementPhase = "in_motion",
      userTriggered = false,
    } = req.body;

    const visionResult = await analyzePoseVision({
      imageBase64,
      exercise,
      repetitions,
      motionDetected,
      movementPhase,
      userTriggered,
    });

    const finalScore = Number(formScore) || visionResult.formScore || 85;
    const isFormCorrect = visionResult.isFormCorrect !== undefined ? visionResult.isFormCorrect : finalScore >= 70;
    let repIncrement = Number(visionResult.repIncrement) > 0 ? 1 : 0;
    if (userTriggered && isFormCorrect && !visionResult.emergencyStop && repIncrement === 0) {
      repIncrement = 1;
    }
    const coachingCue = visionResult.coachingCue || (repIncrement > 0 ? "✓ Full range verified! Rep counted." : "In position - perform full repetition.");

    // Save record to DB if member is authenticated
    if (req.user) {
      await AIAnalysis.create({
        memberId: req.user._id,
        exercise,
        repetitions: Number(repetitions) || 0,
        formScore: finalScore,
        feedback: [
          finalScore >= 80 ? "✓ Good posture & joint alignment" : "⚠ Alignment correction needed",
          finalScore >= 80 ? "✓ Proper range of motion" : "⚠ Maintain dynamic stability & control",
        ],
        llmAssessment: visionResult.assessment,
      });
    }

    res.json({
      success: true,
      exercise,
      formScore: finalScore,
      isFormCorrect,
      repIncrement,
      repCadence: visionResult.repCadence || "optimal",
      cadenceFeedback: visionResult.cadenceFeedback || "Optimal controlled tempo.",
      injuryRiskAlert: Boolean(visionResult.injuryRiskAlert),
      emergencyStop: Boolean(visionResult.emergencyStop),
      emergencyStopReason: visionResult.emergencyStopReason || "",
      coachingCue,
      assessment: visionResult.assessment,
      source: visionResult.source,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/ai/set-summary
 * @desc    Generate LangChain post-set analysis and notify trainer
 * @access  Public or Member
 */
export const generateSetSummary = async (req, res) => {
  try {
    const {
      exercise = "Exercise",
      reps = 0,
      formScore = 85,
      durationSec = 30,
      flaws = [],
      clientContext = {},
    } = req.body;

    let member = null;
    let trainer = null;
    if (req.user) {
      member = await User.findById(req.user._id).select("-password").populate("trainerId", "name email specialty experience phone");
      if (member?.trainerId) {
        trainer = member.trainerId;
      }
    } else if (clientContext.name) {
      member = { name: clientContext.name, email: clientContext.email, role: "member" };
      if (clientContext.trainerName || clientContext.trainer) {
        trainer = { name: clientContext.trainerName || clientContext.trainer };
      }
    }

    const athleteName = member?.name || clientContext.name || "Athlete";
    const trainerName = trainer?.name || clientContext.trainerName || clientContext.trainer || "Coach";

    const { generateSetSummaryWithLangChain } = await import("../services/langchainService.js");

    const summaryResult = await generateSetSummaryWithLangChain({
      exercise,
      reps: Number(reps) || 0,
      formScore: Number(formScore) || 85,
      durationSec: Number(durationSec) || 30,
      athleteName,
      trainerName,
      flaws,
      userContext: { member, trainer },
    });

    // If authenticated member has assigned trainer, dispatch real DB Message
    if (req.user && trainer?._id) {
      try {
        const Message = (await import("../models/Message.js")).default;
        await Message.create({
          senderId: req.user._id,
          receiverId: trainer._id,
          senderName: athleteName,
          senderRole: "member",
          content: `📊 [AI Form Check Set Summary]: ${summaryResult.headline}\n\n${summaryResult.summary}`,
        });
      } catch (e) {
        console.warn("[Auto Chat Message Warning]", e.message);
      }
    }

    res.json({
      success: true,
      ...summaryResult,
      exercise,
      reps: Number(reps) || 0,
      formScore: Number(formScore) || 85,
      durationSec: Number(durationSec) || 30,
      athleteName,
      trainerName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/ai/history/:memberId
 * @desc    Get member's AI analysis history
 * @access  Private
 */
export const getAIHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const records = await AIAnalysis.find({ memberId }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, history: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
