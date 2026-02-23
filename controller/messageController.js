import Conversation from "../model/conversation.js";
import Message from "../model/message.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

const directMessage = async (req, res) => {
  try {

    const { conversationId, recipientId, content } = req.body;
    const senderId = req.user._id;

    if (!content)
      return res.status(400).json({ message: "Thiếu nội dung" });

    let conversation;

    // 🟢 Nếu đã có conversationId (chat đã tồn tại)
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    // 🟡 Nếu chưa có → tạo mới bằng recipient
    if (!conversation && recipientId) {
      conversation = await Conversation.findOne({
        type: "direct",
        $and: [
          { "participants.userId": senderId },
          { "participants.userId": recipientId }
        ]
      });
    }

    // 🔴 Nếu vẫn chưa có → tạo mới
    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() }
        ],
        lastMessageAt: new Date(),
        unreadCount: {}
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content
    });

    updateConversationAfterCreateMessage(
      conversation,
      message,
      senderId
    );

    await conversation.save();

    return res.status(200).json({ message });

  } catch (error) {
    console.log("Lỗi gửi tin nhắn:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const groupMessage = async (req, res) => {
  try {
    const { content, conversationId } = req.body
    const senderId = req.user._id
    const conversation = req.conversation

    if (!content) {
      return res.status(400).json({ message: "Thiếu nội dung" })
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content
    })

    updateConversationAfterCreateMessage(
      conversation,
      message,
      senderId
    )

    await conversation.save()

    return res.status(200).json({ message })

  } catch (error) {
    console.log("Lỗi gửi tin nhắn group:", error)
    return res.status(500).json({ message: "Server error" })
  }
}

export { directMessage, groupMessage };
