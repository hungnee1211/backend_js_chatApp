import express from "express";
import authMiddleware from "../middlewares/authMiddlewares.js";
import {
  createGroup,
  addMember,
  removeMember,
  updateGroup,
  hideGroup,
  getMembers ,
  getGroupConversations,
  updateGroupAvatar
} from "../controller/groupController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.use(authMiddleware);

// create
router.post("/", createGroup);

// list
router.get("/", getGroupConversations);

// update info
router.patch("/:conversationId", updateGroup);

// add member
router.patch("/:conversationId/add", addMember);

// remove / leave
router.patch("/:conversationId/remove", removeMember);

// hide
router.patch("/:conversationId/hide", hideGroup);


// get members
router.get("/:conversationId/members", getMembers);

router.patch("/:conversationId/avatar", upload.single("avatar"), updateGroupAvatar);

export default router;