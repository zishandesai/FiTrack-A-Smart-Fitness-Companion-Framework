import express from "express";
import { sendMessage, getConversation, getChatContacts } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // All chat routes require authentication

router.post("/send", sendMessage);
router.get("/contacts", getChatContacts);
router.get("/conversation/:partnerId", getConversation);

export default router;
