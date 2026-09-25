import express from "express";
import { chatWithAI, analyzeExerciseFrame, getAIHistory, generateSetSummary } from "../controllers/aiController.js";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public or member chat with context extraction
router.post("/chat", optionalProtect, chatWithAI);
// Multimodal camera frame pose analysis
router.post("/analyze-pose", optionalProtect, analyzeExerciseFrame);
// Post-set LangChain analysis & trainer notification
router.post("/set-summary", optionalProtect, generateSetSummary);
// History
router.get("/history/:memberId", protect, getAIHistory);

export default router;
