import express from "express";
import {directMessage , groupMessage}  from "../controller/messageController.js";
import { checkGroupMemberShip } from "../middlewares/messageMiddlewares.js";

const router = express.Router();

router.post("/direct", directMessage);
router.post("/group",checkGroupMemberShip , groupMessage);

export default router;
