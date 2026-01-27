import express from 'express'
import { SignIn , SignOut , SignUp } from '../controller/authController.js'

const router = express.Router()


router.post("/signup" , SignUp)
router.post("/signin" , SignIn)
router.post("/signout" , SignOut)

export default router