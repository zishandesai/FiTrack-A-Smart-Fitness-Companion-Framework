import express from "express";
import { register, login, getMe, changePassword } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/password", protect, changePassword);

export default router;
