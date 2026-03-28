import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({

  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  conversationType: {
    type: String,
    enum: ["direct", "group"],
    required: true,
    index: true,
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  content: {
    type: String,
    trim: true,
    default: "",
  },

  imgUrl: {
    type: String,
    default: null,
  },

  // optional (snapshot để giảm populate)
  senderSnapshot: {
    name: String,
    avatar: String,
  },

}, {
  timestamps: true,
});


messageSchema.index({ conversationId: 1, createdAt: -1 });

messageSchema.index({
  conversationId: 1,
  conversationType: 1,
  createdAt: -1
});



export const Message = mongoose.model("Message", messageSchema);