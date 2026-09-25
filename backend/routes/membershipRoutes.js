import express from "express";
import {
  requestMembership,
  getMemberships,
  approveMembership,
  rejectMembership,
  revokeMembership,
  toggleUserMembership,
} from "../controllers/membershipController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/request", protect, requestMembership);
router.get("/", protect, authorize("admin"), getMemberships);
router.put("/:id/approve", protect, authorize("admin"), approveMembership);
router.put("/:id/reject", protect, authorize("admin"), rejectMembership);
router.put("/:id/revoke", protect, authorize("admin"), revokeMembership);
router.put("/user/:userId/toggle", protect, authorize("admin"), toggleUserMembership);

export default router;
