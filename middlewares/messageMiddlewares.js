import Conversation from "../model/conversation.js"

export const checkGroupMemberShip = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Chua xac thuc" })
        }

        const { conversationId } = req.body
        const userId = req.user._id

        const conversation = await Conversation
            .findById(conversationId)
            .populate("participants.userId")

        console.log("llll",conversation)

        if (!conversation) {
            return res.status(404).json({ message: "khong tim thay cuoc tro chuyen" })
        }

        const isMember = conversation.participants.some(
            p => String(p.userId?._id || p.userId) === String(userId)
        )

        if (!isMember) {
            return res.status(403).json({ message: "b khong phai thanh vien nhom" })
        }

        req.conversation = conversation

        next()
    } catch (error) {
        console.log(error)
        return res.status(500).json("Loi check membership")
    }
}