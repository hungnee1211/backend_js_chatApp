import Conversation from "../model/conversation.js";

export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId
) => {

  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createAt: message.createdAt
    }
  });

  conversation.participants.forEach((p) => {

    // 🔑 Handle cả trường hợp populated & non-populated
    const memberId = (p.userId?._id || p.userId).toString()
    const isSender = memberId === senderId.toString()

    const prevCount =
      conversation.unreadCount.get(memberId) || 0

    conversation.unreadCount.set(
      memberId,
      isSender ? 0 : prevCount + 1
    )
  })

}