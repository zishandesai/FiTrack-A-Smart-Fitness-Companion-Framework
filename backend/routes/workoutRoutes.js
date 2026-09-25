import express from "express";
import { getMemberWorkout, assignWorkout, updateWorkout, completeWorkout } from "../controllers/workoutController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/:memberId", protect, getMemberWorkout);
router.post("/", protect, authorize("trainer", "admin"), assignWorkout);
router.put("/:id/complete", protect, completeWorkout);
router.put("/:id", protect, updateWorkout);

export default router;
