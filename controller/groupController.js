import Conversation from '../model/conversation.js'
import mongoose from "mongoose";


export const createNewGroup = async (req, res) => {
    try {
        const { name, userIds } = req.body; 
        const creatorId = req.user._id;

        if (!name || !userIds || userIds.length < 2) {
            return res.status(400).json({ message: "Tên nhóm và ít nhất 2 thành viên khác là bắt buộc" });
        }

        const uniqueMemberIds = [...new Set([...userIds, creatorId.toString()])];

        const participants = uniqueMemberIds.map(id => ({
            userId: new mongoose.Types.ObjectId(id),
            joinedAt: new Date()
        }));

        const unreadCount = new Map();
        uniqueMemberIds.forEach(id => unreadCount.set(id, 0));

        const newGroup = await Conversation.create({
            type: "group",
            participants,
            group: { name, createdBy: creatorId },
            unreadCount,
            lastMessageAt: new Date(),
            seenBy: [creatorId]
        });

       
        const fullGroupInfo = await Conversation.findById(newGroup._id)
            .populate("participants.userId", "displayName avatarUrl username")
            .lean();

        // Gửi thông báo đến từng thành viên trong nhóm
        uniqueMemberIds.forEach(memberId => {
            // Server.js của bạn đã có socket.join(socket.userId), 
            // nên ta emit vào room có tên là ID của user đó.
            req.io.to(memberId).emit("new-conversation", fullGroupInfo);
        });
        // ----------------------------

        res.status(201).json(fullGroupInfo);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi tạo nhóm", error: error.message });
    }
};



export const addMemberGroup = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Không tìm thấy nhóm" });
    if (conversation.type !== "group") return res.status(400).json({ message: "Đây không phải là nhóm" });

    const isExist = conversation.participants.some(p => p.userId.toString() === userId);
    if (isExist) return res.status(400).json({ message: "Thành viên đã có trong nhóm" });

    // Thêm member mới
    conversation.participants.push({ userId, joinedAt: new Date() });
    
    // Cập nhật map unreadCount cho user mới (nếu schema của bạn yêu cầu)
    if (conversation.unreadCount) {
        conversation.unreadCount.set(userId, 0);
    }

    await conversation.save();

    // Populate lại để lấy thông tin chi tiết user vừa thêm
    const updatedConversation = await Conversation.findById(conversationId)
      .populate("participants.userId", "displayName avatarUrl username")
      .lean();

    // --- SOCKET REAL-TIME ---
    // 1. Thông báo cho người được thêm (họ sẽ thấy nhóm mới xuất hiện trong list)
    req.io.to(userId).emit("new-conversation", updatedConversation);

    // 2. Thông báo cho các thành viên cũ trong nhóm để họ cập nhật danh sách mem
    updatedConversation.participants.forEach(p => {
        if (p.userId._id.toString() !== userId) {
            req.io.to(p.userId._id.toString()).emit("update-conversation", updatedConversation);
        }
    });

    return res.status(200).json(updatedConversation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};