import mongoose from "mongoose";
import Friend from "../model/friend.js";
import FriendRequest from "../model/friendRequest.js";
import User from "../model/user.js";
import { DirectConversation } from "../model/directconversation.js";



const sendFriend = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user._id;

        if (!to) {
            return res.status(400).json({ message: "Thiếu userId" });
        }

        if (from.toString() === to.toString()) {
            return res.status(400).json({ message: "Không thể tự kết bạn" });
        }

        // check user tồn tại
        const userExist = await User.exists({ _id: to });
        if (!userExist) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // chuẩn hóa key friend
        let userA = from.toString();
        let userB = to.toString();
        if (userA > userB) [userA, userB] = [userB, userA];

        // check đã là bạn hoặc đã gửi request
        const [alreadyFriend, existsRequest] = await Promise.all([
            Friend.findOne({ userA, userB }),
            FriendRequest.findOne({
                $or: [
                    { from, to },
                    { from: to, to: from }
                ]
            })
        ]);

        if (alreadyFriend) {
            return res.status(400).json({ message: "Đã là bạn bè" });
        }

        if (existsRequest) {
            return res.status(400).json({ message: "Đã tồn tại lời mời" });
        }

        // tạo request
        const requestDoc = await FriendRequest.create({
            from: new mongoose.Types.ObjectId(from),
            to: new mongoose.Types.ObjectId(to),
            message
        });

        // populate
        const populatedRequest = await FriendRequest.findById(requestDoc._id)
            .populate("from", "_id username displayName avatarUrl")
            .lean();

        // 🔥 SOCKET
        req.io.to(to.toString()).emit("new-friend-request", populatedRequest);

        return res.status(200).json({
            message: "Gửi lời mời thành công",
            request: populatedRequest
        });

    } catch (error) {
        console.log("Lỗi sendFriend:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Không tồn tại request" });
        }

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        // ✅ tạo friend
        await Friend.create({
            userA: request.from,
            userB: request.to
        });

        // ✅ xóa request
        await FriendRequest.findByIdAndDelete(requestId);

        // 🔑 directKey
        const directKey = [request.from.toString(), request.to.toString()]
            .sort()
            .join("_");

        // ✅ tìm hoặc tạo conversation
        let conversation = await DirectConversation.findOne({ directKey });

        if (!conversation) {
            conversation = await DirectConversation.create({
                directKey,
                participants: [
                    { userId: request.from },
                    { userId: request.to }
                ],
                lastMessageAt: new Date(),
                hiddenBy: [] // 👈 đảm bảo không bị ẩn
            });
        }

        // 🔥 populate FULL để gửi về FE
        const fullConversation = await DirectConversation.findById(conversation._id)
            .populate("participants.userId", "username displayName avatarUrl")
            .lean();

       

        req.io.to(request.from.toString()).emit("new-conversation", fullConversation);

        // 👉 user B
        req.io.to(request.to.toString()).emit("new-conversation", fullConversation);

        // =========================

        return res.status(200).json({
            message: "Chấp nhận kết bạn thành công",
            conversation: fullConversation
        });

    } catch (error) {
        console.log("Lỗi acceptFriend:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request không tồn tại" });
        }

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        await FriendRequest.findByIdAndDelete(requestId);

        // 🔥 SOCKET (optional)
        req.io.to(request.from.toString()).emit("friend-declined", requestId);

        return res.status(200).json({
            message: "Từ chối kết bạn thành công"
        });

    } catch (error) {
        console.log("Lỗi declineFriend:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


const getAllListFriend = async (req, res) => {
    try {
        const userId = req.user._id;

        const friends = await Friend.find({
            $or: [
                { userA: userId },
                { userB: userId }
            ]
        })
            .populate("userA", "_id username displayName avatarUrl")
            .populate("userB", "_id username displayName avatarUrl")
            .lean();

        const friendList = friends.map(f => {
            return f.userA._id.toString() === userId.toString()
                ? f.userB
                : f.userA;
        });

        return res.status(200).json(friendList);

    } catch (error) {
        console.log("Lỗi getAllListFriend:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


const getListFriendRequest = async (req, res) => {
    try {
        const userId = req.user._id;

        const requests = await FriendRequest.find({
            to: userId 
        })
            .populate("from", "_id username displayName avatarUrl")
            .lean();
        
        console.log(requests)
        return res.status(200).json(requests);

    } catch (error) {
        console.log("Lỗi getListFriendRequest:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


export {
    sendFriend,
    acceptFriendRequest,
    declineFriendRequest,
    getAllListFriend,
    getListFriendRequest
};