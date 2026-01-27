import express from 'express'
import { createConversation , getConversation , getMessage } from '../controller/conversationController.js'

const router = express.Router()


router.post("/" , createConversation)
router.get("/" , getConversation)
router.get("/:conversationId/message" , getMessage)

export default router