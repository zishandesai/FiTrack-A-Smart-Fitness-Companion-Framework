import express from "express";
import {
  getMembers,
  getAvailableProMembers,
  getMemberById,
  updateMember,
  deleteMember,
  assignTrainerToMember,
  removeTrainerFromMember,
} from "../controllers/memberController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect); // All member routes require auth

router.get("/available-pro", authorize("admin", "trainer"), getAvailableProMembers);
router.get("/", authorize("admin", "trainer"), getMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.delete("/:id", authorize("admin"), deleteMember);

// Trainer Assignment / Unassignment
router.post("/:id/assign-trainer", assignTrainerToMember);
router.post("/:id/remove-trainer", removeTrainerFromMember);

export default router;
