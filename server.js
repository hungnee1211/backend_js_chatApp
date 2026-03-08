import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './db/db.js'

import authRouter from "./router/authRouter.js"
import friendRouter from './router/friendRouter.js'
import userRouter from './router/userRouter.js'
import messageRouter from './router/messageRouter.js'
import conversationRouter from './router/conversationRouter.js'
import checkCookieRouter from './router/checkCookieRouter.js'

import authMiddleware from './middlewares/authMiddlewares.js'
import { socketMiddlewareIo } from './middlewares/socketMiddleware.js'

import cookieParser from 'cookie-parser'
import { createServer } from "http"
import { Server } from "socket.io"

import User from "./model/user.js"

dotenv.config()

const app = express()

// ===== MIDDLEWARE =====
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}))

app.use(cookieParser())
app.use(express.json())

// ===== ROUTES =====
app.use("/api/auth", authRouter)
app.use("/api/friend", authMiddleware, friendRouter)
app.use("/api/users", userRouter)
app.use("/api/message", authMiddleware, messageRouter)
app.use("/api/conversation", authMiddleware, conversationRouter)
app.use("/api", checkCookieRouter)


// ===== SOCKET SERVER =====
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
})

// auth socket
io.use(socketMiddlewareIo)

io.on("connection", (socket) => {

  console.log("🟢 Socket connected:", socket.id)

  // ===== JOIN ROOM USER =====
  socket.join(socket.userId)
  console.log("User joined room:", socket.userId)


  // ===== JOIN CONVERSATION =====
  socket.on("join-conversation", (conversationId) => {
    socket.join(conversationId)
    console.log("Joined conversation:", conversationId)
  })


  // =============================
  // CHAT MESSAGE
  // =============================

  socket.on("send-message", async (data) => {

    const { conversationId, content, tempId } = data

    const user = await User.findById(socket.userId)
      .select("_id displayName avatarUrl username")

    const fullMessage = {
      _id: Date.now().toString(),
      conversationId,
      content,
      senderId: socket.userId,
      createdAt: new Date(),
      temp: false,
      tempId,

      senderInfor: {
        _id: user._id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        username: user.username
      }
    }

    console.log("Sender:", socket.userId)

    // realtime message
    io.to(conversationId).emit("receive-message", fullMessage)

    // realtime last message
    io.to(conversationId).emit("last-message", {
      conversationId,
      message: fullMessage
    })

  })


 


// SEND FRIEND REQUEST
socket.on("send-friend-request", (request) => {

  const { toUserId } = request

  io.to(toUserId).emit("friend_request_received", request)

  socket.emit("friend_request_sent", request)

})


// CANCEL REQUEST
socket.on("cancel-friend-request", ({ requestId, toUserId }) => {

  io.to(toUserId).emit("friend_request_cancelled", requestId)

  socket.emit("friend_request_cancelled", requestId)

})


// REJECT REQUEST
socket.on("reject-friend-request", ({ requestId, fromUserId }) => {

  io.to(fromUserId).emit("friend_request_rejected", requestId)

})


// ACCEPT REQUEST
socket.on("accept-friend-request", ({ requestId, fromUserId, friend }) => {

  io.to(fromUserId).emit("friend_request_accepted", {
    requestId,
    friend
  })

  socket.emit("friend_request_accepted", {
    requestId,
    friend
  })

})

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id)
  })

})


// ===== START SERVER =====
const PORT = process.env.PORT || 5001

server.listen(PORT, () => {
  ConnectDB()
  console.log("🚀 Server running on", PORT)
})