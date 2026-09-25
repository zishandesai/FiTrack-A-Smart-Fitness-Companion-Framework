import express from "express";
import {
  createRequest,
  getMyRequests,
  getAllRequests,
  reviewRequest,
} from "../controllers/requestController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect); // All routes require authentication

router.post("/", createRequest);
router.get("/my", getMyRequests);

// Admin-only endpoints
router.get("/", authorize("admin"), getAllRequests);
router.put("/:id/review", authorize("admin"), reviewRequest);

export default router;
