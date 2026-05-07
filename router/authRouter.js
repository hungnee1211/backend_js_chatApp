import express from 'express'
import { SignIn , SignOut , SignUp , RefreshToken } from '../controller/authController.js'

const router = express.Router()


router.post("/signup" , SignUp)
router.post("/signin" , SignIn)
router.post("/signout" , SignOut)
router.post("/refresh-token", RefreshToken)

export default router