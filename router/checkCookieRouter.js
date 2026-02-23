import express from 'express'
import { checkCookie } from '../controller/checkCookieController.js'

const router = express.Router()


router.get("/checkcookie" , checkCookie)


export default router