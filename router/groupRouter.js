import express from "express";
const router = express.Router();
import { createNewGroup } from "../controller/groupController.js";
import authMiddleware from "../middlewares/authMiddlewares.js";
import { addMemberGroup } from "../controller/groupController.js";


router.post("/create", authMiddleware, createNewGroup);
router.patch("/add-member", authMiddleware, addMemberGroup)

export default router;