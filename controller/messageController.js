import Conversation from "../model/conversation.js";
import Message from "../model/message.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

const directMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
   
    const senderId = req.user._id;

    if (!content) return res.status(400).json({ message: "Thiếu nội dung" });

    let conversation 

    if (conversationId) {
      // đúng: findById hoặc findOne({ _id: conversationId })
      conversation = await Conversation.findOne({ _id:conversationId });

      console.log("run...")
    }

    if (!conversation) {

      console.log("runnnn...")
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

    console.log("message" , message)

    // nếu updateConversationAfterCreateMessage là async thì await nó
    if (typeof updateConversationAfterCreateMessage === "function") {
      await updateConversationAfterCreateMessage(conversation, message, senderId);
    }

    // nếu helper không cập nhật conversation trực tiếp, bạn có thể cập nhật thủ công ở đây
    // await conversation.save();

    return res.status(200).json({ message });
  } catch (error) {
    console.log("Lỗi gửi tin nhắn:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const groupMessage = async (req, res) => {
  try {
    const {content , conversationId} = req.body 
    const senderId = req.user._id

    const conversation = req.conversation

    if(!content){return res.status(400).json({message:"Thiếu nội dung"})}

    const message = await Message.create({
      conversationId,
      senderId,
      content
    })

    
    updateConversationAfterCreateMessage(conversation , message , senderId)

    await conversation.save()
    
  
    return res.status(200).json({ message });
    
  } catch (error) {
    console.log("Lỗi gửi tin nhắn group:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export  { directMessage, groupMessage };
