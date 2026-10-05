import express from "express";
import {
  getTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerStats,
} from "../controllers/trainerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, getTrainers);
router.post("/", protect, authorize("admin"), createTrainer);
router.put("/:id", protect, authorize("admin"), updateTrainer);
router.delete("/:id", protect, authorize("admin"), deleteTrainer);
router.get("/dashboard-stats", protect, authorize("trainer"), getTrainerStats);

export default router;
