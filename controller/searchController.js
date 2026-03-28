import { DirectConversation } from "../model/directconversation.js";
import { GroupConversation } from "../model/groupconversation.js";

export const searchConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm" });
    }

    const keyword = new RegExp(q, "i");

    const directConversations = await DirectConversation.find({
      "participants.userId": userId,
      hiddenBy: { $ne: userId }
    })
      .populate("participants.userId", "displayName username avatarUrl")
      .lean();

    const filteredDirect = directConversations
      .map(conv => {
        const otherUser = conv.participants.find(
          p => p.userId._id.toString() !== userId.toString()
        )?.userId;

        if (!otherUser) return null;

        const match =
          keyword.test(otherUser.displayName || "") ||
          keyword.test(otherUser.username || "");

        if (!match) return null;

        return {
          _id: conv._id,
          user: otherUser,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt
        };
      })
      .filter(Boolean);

    // =====================
    // 🔥 GROUP CHAT
    // =====================
    const groupConversations = await GroupConversation.find({
      "participants.userId": userId,
      hiddenBy: { $ne: userId },
      name: keyword
    })
      .populate("participants.userId", "displayName username avatarUrl")
      .sort({ lastMessageAt: -1 })
      .lean();

    const filteredGroup = groupConversations.map(group => ({
      _id: group._id,
      name: group.name,
      participants: group.participants,
      lastMessage: group.lastMessage,
      lastMessageAt: group.lastMessageAt
    }));

   
    return res.status(200).json({
      direct: filteredDirect,
      group: filteredGroup
    });

  } catch (error) {
    console.log("Lỗi searchConversation:", error);
    return res.status(500).json({ message: "Server error" });
  }
};