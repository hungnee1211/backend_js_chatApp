import { GroupConversation } from "../model/groupconversation.js";
import mongoose from "mongoose";


export const createGroup = async (req, res) => {
  try {
    const { name, userIds } = req.body;
    const creatorId = req.user._id;

    if (!name || !userIds || userIds.length < 1) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    const uniqueIds = [...new Set([...userIds, creatorId.toString()])];

    const participants = uniqueIds.map(id => ({
      userId: new mongoose.Types.ObjectId(id),
      role: id === creatorId.toString() ? "admin" : "member",
      joinedAt: new Date(),
      unreadCount: 0
    }));

    const group = await GroupConversation.create({
      name,
      createdBy: new mongoose.Types.ObjectId(creatorId),
      participants,
      lastMessageAt: new Date()
    });

    const full = await GroupConversation.findById(group._id)
      .populate("participants.userId", "displayName avatarUrl username")
      .lean();

    // 🔥 QUAN TRỌNG: Thêm type: "group" để Frontend nhận diện đúng
    const dataToEmit = { ...full, type: "group" };

    uniqueIds.forEach(id => {
      // Gửi cho tất cả mọi người (bao gồm cả người tạo để đồng bộ các tab khác)
      req.io.to(id.toString()).emit("new-conversation", dataToEmit);
    });

    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const group = await GroupConversation.findById(conversationId);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    const isExist = group.participants.some(p => p.userId.toString() === userId);
    if (isExist) return res.status(400).json({ message: "Đã tồn tại" });

    group.participants.push({
      userId,
      role: "member",
      joinedAt: new Date(),
      unreadCount: 0
    });

    await group.save();

    const updated = await GroupConversation.findById(conversationId)
      .populate("participants.userId", "displayName avatarUrl username")
      .lean();

    const dataForSocket = { ...updated, type: "group" };

    // socket
    req.io.to(userId).emit("new-conversation", dataForSocket);

    updated.participants.forEach(p => {
      if (p.userId._id.toString() !== userId) {
        // Gửi cập nhật cho những người cũ trong nhóm
        req.io.to(p.userId._id.toString()).emit("update-conversation", dataForSocket);
      }
    });

    res.json(updated);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    const currentUserId = req.user._id;

    const group = await GroupConversation.findById(conversationId);
    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    const isMember = group.participants.some(
      p => p.userId.toString() === userId
    );
    if (!isMember) {
      return res.status(400).json({ message: "User không thuộc nhóm" });
    }

    const isSelfLeave = currentUserId.toString() === userId;

    // 👉 nếu không phải self leave → phải là admin
    if (!isSelfLeave) {
      const currentUser = group.participants.find(
        p => p.userId.toString() === currentUserId.toString()
      );

      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền" });
      }
    }

    // remove user
    group.participants = group.participants.filter(
      p => p.userId.toString() !== userId
    );

    await group.save();

    // socket
    const updatedGroup = await GroupConversation.findById(conversationId)
      .populate("participants.userId", "displayName avatarUrl username").lean();

    const dataForOthers = { ...updatedGroup, type: "group" };

    // Báo cho người bị xóa
    if (isSelfLeave) {
      req.io.to(userId).emit("left-group", conversationId);
    } else {
      req.io.to(userId).emit("removed-from-group", conversationId);
    }

    // Cập nhật danh sách cho những người còn lại
    updatedGroup.participants.forEach(p => {
      req.io.to(p.userId._id.toString()).emit("update-conversation", dataForOthers);
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { conversationId, name } = req.body;

    const group = await GroupConversation.findByIdAndUpdate(
      conversationId,
      { name},
      { new: true }
    ).populate("participants.userId", "displayName avatarUrl username");

    const dataToEmit = { ...group, type: "group" };

    group.participants.forEach(p => {
      req.io.to(p.userId._id.toString()).emit("update-conversation", group);
    });

    res.json(group);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const hideGroup = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user._id;

    await GroupConversation.findByIdAndUpdate(conversationId, {
      $addToSet: { hiddenBy: userId }
    });

    res.json({ message: "Đã ẩn chat" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getMembers = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const group = await GroupConversation.findById(conversationId)
      .populate("participants.userId", "displayName avatarUrl username");

    res.json(group.participants);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getGroupConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await GroupConversation.find({
      "participants.userId": userId,

      // ❗ không lấy chat đã ẩn
      hiddenBy: { $ne: userId }
    })
      .populate("participants.userId", "displayName avatarUrl username")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).json(groups);

  } catch (error) {
    console.log("Lỗi getGroupConversations:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateGroupAvatar = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: "Không có file nào được tải lên" });
    }

    // Đường dẫn ảnh (tùy thuộc vào cách bạn cấu hình static folder)
    const avatarPath = `/uploads/${req.file.filename}`;

    const group = await GroupConversation.findByIdAndUpdate(
      conversationId,
      { avatar: avatarPath },
      { new: true }
    ).populate("participants.userId", "displayName avatarUrl username").lean();

    if (!group) return res.status(404).json({ message: "Không tìm thấy nhóm" });

    const dataToEmit = { ...group, type: "group" };

    // Gửi socket cho tất cả thành viên trong nhóm
    group.participants.forEach(p => {
      const targetId = p.userId._id ? p.userId._id.toString() : p.userId.toString();
      req.io.to(targetId).emit("update-conversation", dataToEmit);
    });

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};