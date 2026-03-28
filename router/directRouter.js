import express from "express";
import authMiddleware from "../middlewares/authMiddlewares.js";
import {
  createDirect,
  hideDirect,
  blockUser,
  unblockUser,
  getDirectConversations
} from "../controller/directController.js";

const router = express.Router();

router.use(authMiddleware);


router.post("/", createDirect)
router.get("/", getDirectConversations)
router.patch("/:conversationId/hide", hideDirect)
router.patch("/:conversationId/block", blockUser)
router.patch("/:conversationId/unblock", unblockUser)

export default router;