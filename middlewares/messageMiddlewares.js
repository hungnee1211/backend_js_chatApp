import Conversation from "../model/conversation.js"


export const checkGroupMemberShip = async (req , res , next) => {

    try {
        const {conversationId } = req.body
        const userId = req.user._id

        const conversation = await Conversation.findById(conversationId)

        if(!conversation) {return res.status(404).json({message:"khong tim thay cuoc tro chuyen"})}


        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === userId.toString()
        )

        if(!isMember) {return res.status(403).json({message:"b khong phai thanh vien nhom"})}

        req.conversation = conversation

        next()
    } catch (error) {
        console.log(error)
        return res.status(500).json("Loi he thong check membership")
    }
}