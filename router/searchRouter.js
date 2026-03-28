import express from 'express'
import { searchConversation } from '../controller/searchController.js'
import authMiddleware from '../middlewares/authMiddlewares.js'

const router = express.Router()


router.get("/search" ,authMiddleware , searchConversation)


export default router