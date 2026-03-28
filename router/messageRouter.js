import express from "express";
import authMiddleware from "../middlewares/authMiddlewares.js";
import {
  directMessage,
  groupMessage,
  getMessages,
  markAsRead
} from "../controller/messageController.js";

const router = express.Router();

router.use(authMiddleware);

// gửi tin direct
router.post("/direct", directMessage);

// gửi tin group
router.post("/group", groupMessage);

// load message
router.get("/:conversationId", getMessages);

// seen
router.patch("/:conversationId/read", markAsRead);

export default router;