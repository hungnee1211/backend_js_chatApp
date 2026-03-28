import { DirectConversation } from "../model/directconversation.js"
import Friend from "../model/friend.js";
// --- Sửa lại directController.js ---

export const hideDirect = async (req, res) => {
  try {
    // CHÚ Ý: Lấy từ params vì router để là /:conversationId/hide
    const { conversationId } = req.params; 
    const userId = req.user._id;

    await DirectConversation.findByIdAndUpdate(conversationId, {
      $addToSet: { hiddenBy: userId }
    });

    req.io.to(userId.toString()).emit("remove-conversation", conversationId);
    res.json({ message: "Đã ẩn chat" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { conversationId } = req.params; // Sửa ở đây
    const userId = req.user._id;

    const updatedConv = await DirectConversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { blockedBy: userId } },
      { new: true }
    ).populate("participants.userId");

    // Tìm ID của người bị chặn để gửi socket
    const otherParticipant = updatedConv.participants.find(
      (p) => p.userId._id.toString() !== userId.toString()
    );
    const recipientId = otherParticipant?.userId._id.toString();

    if (recipientId) {
      // Gửi cho người bị chặn
      req.io.to(recipientId).emit("on-block-status-change", {
        conversationId,
        blockedBy: updatedConv.blockedBy,
      });
    }

    // Gửi cho chính người chặn (để đồng bộ các tab khác nếu có)
    req.io.to(userId.toString()).emit("on-block-status-change", {
      conversationId,
      blockedBy: updatedConv.blockedBy,
    });

    res.json({ message: "Đã chặn user", blockedBy: updatedConv.blockedBy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const unblockUser = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const updatedConv = await DirectConversation.findByIdAndUpdate(
      conversationId,
      { $pull: { blockedBy: userId } },
      { new: true }
    );

    const otherParticipant = updatedConv.participants.find(
      (p) => p.userId.toString() !== userId.toString()
    );

    const data = { conversationId, blockedBy: updatedConv.blockedBy };
    
    if (otherParticipant) req.io.to(otherParticipant.userId.toString()).emit("on-block-status-change", data);
    req.io.to(userId.toString()).emit("on-block-status-change", data);

    res.json({ message: "Đã bỏ chặn" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const createDirect = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ message: "Thiếu recipientId" });
    }

    // 🚨 CHECK FRIEND
    let userA = userId.toString();
    let userB = recipientId.toString();
    if (userA > userB) [userA, userB] = [userB, userA];

    const isFriend = await Friend.findOne({ userA, userB });

    if (!isFriend) {
      return res.status(403).json({ message: "Chưa là bạn bè" });
    }

    // 🔑 directKey
    const directKey = [userId.toString(), recipientId.toString()]
      .sort()
      .join("_");

    // 🔍 tìm conversation
    let conversation = await DirectConversation.findOne({ directKey });

    // 🆕 tạo nếu chưa có
    if (!conversation) {
      conversation = await DirectConversation.create({
        directKey,
        participants: [
          { userId },
          { userId: recipientId }
        ],
        lastMessageAt: new Date()
      });
    }

    // 🔥 UNHIDE nếu có
    await DirectConversation.findByIdAndUpdate(conversation._id, {
      $pull: { hiddenBy: userId }
    });

    return res.status(200).json(conversation);

  } catch (error) {
    console.log("Lỗi createDirect:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getDirectConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await DirectConversation.find({
      "participants.userId": userId,
      hiddenBy: { $ne: userId }
    })
      .populate("participants.userId", "displayName avatarUrl username")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    // 🎯 lấy info người còn lại
    const result = conversations.map(conv => {
      const otherUser = conv.participants.find(
        p => p.userId._id.toString() !== userId.toString()
      );

      const me = conv.participants.find(
        p => p.userId._id.toString() === userId.toString()
      );

      return {
        ...conv,
        user: otherUser?.userId || null,
        unreadCount: me?.unreadCount || 0
      };
    });

    return res.status(200).json(result);

  } catch (error) {
    console.log("Lỗi getDirectConversations:", error);
    return res.status(500).json({ message: "Server error" });
  }
};