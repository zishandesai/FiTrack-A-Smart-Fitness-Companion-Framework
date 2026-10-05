import express from "express";
import {
  getAttendanceSummary,
  getMemberAttendance,
  logAttendance,
  updateMemberAttendance,
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/summary", protect, authorize("admin"), getAttendanceSummary);
router.get("/:memberId", protect, getMemberAttendance);
router.post("/", protect, logAttendance);
router.put("/member/:memberId", protect, authorize("trainer", "admin"), updateMemberAttendance);

export default router;
