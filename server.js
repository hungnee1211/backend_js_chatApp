import express  from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './db/db.js'
import authRouter from "./router/authRouter.js"
import friendRouter from './router/friendRouter.js'
import userRouter from './router/userRouter.js'
import authMiddleware from './middlewares/authMiddlewares.js'
import messageRouter from './router/messageRouter.js'
import conversationRouter from './router/conversationRouter.js'
import checkCookieRouter from './router/checkCookieRouter.js'
import cookieParser from 'cookie-parser'

const app = express()
dotenv.config()





app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}))

app.use(cookieParser())

app.use(express.json())


app.use("/api/auth" , authRouter)
app.use("/api/friend" ,authMiddleware, friendRouter)
app.use("/api/users" , userRouter)
app.use("/api/message" , authMiddleware ,messageRouter)
app.use("/api/conversation" ,authMiddleware , conversationRouter)
app.use("/api", checkCookieRouter)




const PORT = process.env.PORT || 5001

app.listen(PORT , () => {
    ConnectDB()
    console.log("Server running ...")
})