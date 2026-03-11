import Friend from "../model/friend.js"
import friendRequest from "../model/friendRequest.js"
import Conversation from "../model/conversation.js"
import User from "../model/user.js"


const sendFriend = async (req, res) => {
    try {
        const { to, message } = req.body
        if (req.user._id.toString() === to.toString()) return res.status(400).json({ message: "khong tu gui loi moi cho chinh minh" })

        const UserExist = await User.exists({ _id: to })
        if (!UserExist) return res.status(404).json({ message: "Nguoi dung khong ton tai" })

        let userA = req.user._id.toString()
        let userB = to.toString()
        if (userA > userB) [userA, userB] = [userB, userA]

        const from = req.user._id

        const [alreadyFriend, existsRequest] = await Promise.all([
            Friend.findOne({ userA, userB }),
            friendRequest.findOne({
                $or: [
                    { from, to },
                    { from: to, to: from }
                ]
            })
        ])

        if (alreadyFriend) return res.status(400).json({ message: "Da la ban be" })
        if (existsRequest) return res.status(400).json({ message: "Da ton tai loi moi ket ban" })

        const requestDoc = await friendRequest.create({
            from,
            to,
            message
        })

        // BỔ SUNG: Populate để lấy thông tin người gửi cho Socket
        const populatedRequest = await friendRequest.findById(requestDoc._id)
            .populate("from", "_id username displayName avatarUrl")
            .lean()

        return res.status(200).json({
            message: "Gui loi moi ket ban thanh cong",
            request: populatedRequest // Trả về object đã có thông tin user
        })

    } catch (error) {
        console.log("Loi khong the gui ket ban", error)
        return res.status(500).json({ message: "Loi khong the gui ket ban" })
    }
}

const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params
        const userId = req.user._id

        const request = await friendRequest.findById(requestId)

        if (!request)
            return res.status(404).json({ message: "Khong ton tai loi moi kb" })

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Ban khong co quyen chap nhan loi moi nay" })
        }

        // ✅ Tạo quan hệ bạn bè
        const friend = await Friend.create({
            userA: request.from,
            userB: request.to
        })

        await friendRequest.findByIdAndDelete(requestId)


        let conversation = await Conversation.findOne({
            type: "direct",
            "participants.userId": {
                $all: [request.from, request.to]
            }
        })

        if (!conversation) {
            conversation = new Conversation({
                type: "direct",
                participants: [
                    { userId: request.from },
                    { userId: request.to }
                ],
                lastMessageAt: new Date()
            })

            await conversation.save()
        }

        const from = await User.findById(request.from)
            .select('_id username displayName avatarUrl')
            .lean()

        return res.status(200).json({
            message: "Chap nhan ket ban thanh cong",
            fromUserId: request.from, 
            newFriend: {
                _id: req.user._id, 
                username: req.user.username,
                displayName: req.user.displayName,
                avatarUrl: req.user.avatarUrl
            },
            conversationId: conversation._id
        })

    } catch (error) {
        console.log("Loi khong the chap nhan ket ban", error)
        return res.status(500).json({ message: "Loi khong the chap nhan ket ban" })
    }
}


const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params

        const userId = req.user._id

        const request = await friendRequest.findById(requestId)

        if (!request) return res.status(404).json({ message: "Loi moi khong ton tai" })

        if (request.to.toString() !== userId.toString()) return res.status(403).json({ message: "Ban khong co quyen tu choi kb" })

        await friendRequest.findByIdAndDelete(requestId)

        return res.status(200).json({ message: "Tu choi ket ban thanh cong" })


    } catch (error) {
        console.log("Loi khong the gui ket ban", error)
        return res.status(500).json({ message: "Loi khong the tu choi ket ban" })
    }
}

const getAllListFriend = async (req, res) => {
    try {
        const userId = req.user._id

        const friends = await Friend.find({
            $or: [
                { userA: userId },
                { userB: userId }
            ]

        })
            .populate("userA", "_id username displayName avatarUrl")
            .populate("userB", "_id username displayName avatarUrl")
            .lean()


        //xac dinh nguoi ban khong phai ban
        const friendList = friends.map(f => {
            return f.userA._id.toString() === userId.toString()
                ? f.userB
                : f.userA
        })

        return res.status(200).json(friendList)

    } catch (error) {
        console.log("Loi khong the gui ket ban", error)
        return res.status(500).json({ message: "Loi khong the lay danh sach ket ban" })
    }
}

const getListFriendRequest = async (req, res) => {
    try {

        const userId = req.user._id

        const requests = await friendRequest.find({
            to: userId,

        })
            .populate("from", "_id username displayName avatarUrl")
            .lean()

        console.log(requests)
        console.log(userId)
        return res.status(200).json(requests)

    } catch (error) {
        console.log("Loi khong the gui ket ban", error)
        return res.status(500).json({ message: "Loi khong the lay danh sach yeu cau ket ban" })
    }
}


export { sendFriend, acceptFriendRequest, declineFriendRequest, getAllListFriend, getListFriendRequest }