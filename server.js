import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from "http"
import { Server } from "socket.io"

import ConnectDB from './db/db.js'
import User from "./model/user.js"

// Route Imports
import authRouter from "./router/authRouter.js"
import friendRouter from './router/friendRouter.js'
import userRouter from './router/userRouter.js'
import messageRouter from './router/messageRouter.js'
import checkCookieRouter from './router/checkCookieRouter.js'
import groupRouter from './router/groupRouter.js' 
import searchRouter from './router/searchRouter.js'
import directRouter from './router/directRouter.js'
import authMiddleware from './middlewares/authMiddlewares.js'
import { socketMiddlewareIo } from './middlewares/socketMiddleware.js'
import { searchConversation } from './controller/searchController.js'

dotenv.config()
const app = express()
const server = createServer(app)


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
})


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use("/uploads", express.static("uploads"))


app.use((req, res, next) => {
  req.io = io;
  next();
});


app.use("/api/auth", authRouter)
app.use("/api/friend", authMiddleware, friendRouter)
app.use("/api/users", userRouter)
app.use("/api/direct", directRouter);
app.use("/api/group", groupRouter);
app.use("/api/message", messageRouter);
app.use("/api/conversation" , searchRouter)
app.use("/api", checkCookieRouter)



// 5. Logic Socket.io
io.use(socketMiddlewareIo)

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id)
  
  const userId = socket.handshake.query.userId; 

  if (userId) {
    socket.join(userId); 
    console.log(`User ${userId} đã join room cá nhân`);
  }

  socket.on("join-conversation", (conversationId) => {
    socket.join(conversationId)
  })



  socket.on("send-friend-request", (data) => {
    if (data.toUserId) {
      io.to(data.toUserId).emit("friend_request_received", data);
    }
  });

 
  socket.on("accept-friend-request", (data) => {
    if (data.fromUserId) {
      io.to(data.fromUserId).emit("friend_request_accepted", {
        newFriend: data.friend,
        requestId: data.requestId
      });
    }
  });

  socket.on("disconnect", () => console.log("❌ User disconnected"))
})

const PORT = process.env.PORT || 5001
server.listen(PORT, () => {
  ConnectDB()
  console.log("🚀 Server running on", PORT)
})