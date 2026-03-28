import { DirectConversation } from "../model/directconversation.js";
import { GroupConversation } from "../model/groupconversation.js";
import { Message } from "../model/message.js";
import User from "../model/user.js";

export const directMessage = async (req, res) => {
  try {
    const { conversationId, recipientId, content } = req.body;
    const senderId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Thiếu nội dung" });
    }

    let conversation;

    // 🔍 tìm conversation
    if (conversationId) {
      conversation = await DirectConversation.findById(conversationId);
    }

    // 🔍 tìm theo 2 user
    if (!conversation && recipientId) {
      const directKey = [senderId.toString(), recipientId.toString()]
        .sort()
        .join("_");

      conversation = await DirectConversation.findOne({ directKey });
    }

    // 🆕 tạo mới nếu chưa có
    if (!conversation) {
      const directKey = [senderId.toString(), recipientId.toString()]
        .sort()
        .join("_");

      conversation = await DirectConversation.create({
        directKey,
        participants: [
          { userId: senderId },
          { userId: recipientId }
        ],
        lastMessageAt: new Date()
      });
    }

    // 🚨 CHECK BLOCK
    const isBlocked = conversation.blockedBy?.some(
      id => id.toString() !== senderId.toString()
    );

    if (isBlocked) {
      return res.status(403).json({ message: "Bạn đã bị chặn" });
    }

    // 👤 snapshot
    const user = await User.findById(senderId);

    // 💬 tạo message
    const message = await Message.create({
      conversationId: conversation._id,
      conversationType: "direct",
      senderId,
      content,
      senderSnapshot: {
        name: user.displayName,
        avatar: user.avatarUrl
      }
    });

    // 🔥 UNHIDE khi gửi
    await DirectConversation.findByIdAndUpdate(conversation._id, {
      $pull: { hiddenBy: senderId }
    });

    // 🔥 UPDATE CONVERSATION
    await DirectConversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastMessageAt: message.createdAt,
      $inc: {
        "participants.$[elem].unreadCount": 1
      }
    }, {
      arrayFilters: [{ "elem.userId": { $ne: senderId } }]
    });

    // 📡 SOCKET
   
   // 📡 SOCKET (Chỉ gửi cho những người KHÁC trong cuộc trò chuyện)
const participants = conversation.participants;

participants.forEach((p) => {
  const targetUserId = p.userId.toString();

  // 🛡️ CHỈ EMIT NẾU KHÔNG PHẢI LÀ NGƯỜI GỬI
  if (targetUserId !== senderId.toString()) {
    req.io.to(targetUserId).emit("new-message", message);
    req.io.to(targetUserId).emit("last-message", {
      conversationId: conversation._id,
      message: message
    });
  }
});

    return res.status(200).json({ message });

  } catch (error) {
    console.log("Lỗi direct:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const groupMessage = async (req, res) => {
  try {
    const { content, conversationId } = req.body;
    const senderId = req.user._id;

    // 1. Kiểm tra đầu vào cơ bản
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
    }

    // 2. Tìm group và kiểm tra quyền hạn (phải là thành viên mới được gửi)
    const conversation = await GroupConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy nhóm trò chuyện" });
    }

    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === senderId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Bạn không phải thành viên của nhóm này" });
    }

    // 3. Lấy thông tin người gửi để làm snapshot (giúp frontend hiển thị nhanh)
    const sender = await User.findById(senderId).select("displayName avatarUrl");

    // 4. Tạo tin nhắn mới trong Database
    const message = await Message.create({
      conversationId,
      conversationType: "group",
      senderId,
      content,
      senderSnapshot: {
        name: sender.displayName,
        avatar: sender.avatarUrl
      }
    });

    // 5. Cập nhật thông tin hội thoại (Last Message & Unread Count)
    // Lưu ý: Chỉ tăng unreadCount cho những người KHÔNG PHẢI người gửi
    await GroupConversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessage: message._id,
          lastMessageAt: message.createdAt,
        },
        $inc: {
          "participants.$[elem].unreadCount": 1
        }
      },
      {
        arrayFilters: [{ "elem.userId": { $ne: senderId } }],
        new: true
      }
    );

    // 6. 📡 XỬ LÝ SOCKET (QUAN TRỌNG ĐỂ TRÁNH DUPLICATE)
    // Duyệt qua tất cả participants để gửi tin nhắn real-time
    conversation.participants.forEach((p) => {
      const targetUserId = p.userId.toString();

      // CHỈ gửi socket cho những người nhận (không gửi cho chính người gửi)
      // Người gửi sẽ nhận được dữ liệu qua API Response ở cuối hàm này
      if (targetUserId !== senderId.toString()) {
        req.io.to(targetUserId).emit("new-message", message);
        
        // Gửi thêm event để update sidebar (last message) cho người nhận
        req.io.to(targetUserId).emit("last-message", {
          conversationId,
          message: message
        });
      }
    });

    // 7. Trả về kết quả cho người gửi (Frontend người gửi dùng cái này để hiện tin nhắn)
    return res.status(200).json({ 
      success: true, 
      message 
    });

  } catch (error) {
    console.error("Lỗi trong hàm groupMessage:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi gửi tin nhắn nhóm" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Cần xác định hội thoại này là Direct hay Group để Update đúng Model
    // Hoặc nếu bạn dùng chung 1 logic:
    const updateQuery = {
      $set: { "participants.$[elem].unreadCount": 0 }
    };
    const options = {
      arrayFilters: [{ "elem.userId": userId }],
      new: true
    };

    // Thử update ở DirectConversation, nếu không có thì update ở Group
    let updated = await DirectConversation.findByIdAndUpdate(conversationId, updateQuery, options);
    if (!updated) {
      updated = await GroupConversation.findByIdAndUpdate(conversationId, updateQuery, options);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 }) // BẮT BUỘC: 1 để tin cũ ở trên, tin mới ở dưới
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};