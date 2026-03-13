import express from "express"
import { getUser , getUsersByKeyword, getUserDetail , updateUser} from "../controller/userController.js"
import authMiddleware from "../middlewares/authMiddlewares.js"
import upload from "../middlewares/multer.js"


const router = express.Router()

router.get("/" , getUser)
router.get("/me" ,authMiddleware , getUserDetail)
router.get("/search" ,authMiddleware , getUsersByKeyword)
router.patch(
  "/update",
  authMiddleware,
  upload.single("avatar"),
  updateUser
)


export default router