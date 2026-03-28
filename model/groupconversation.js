import mongoose from "mongoose";

const groupParticipantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    role: {
        type: String,
        enum: ["member", "admin"],
        default: "member",
    },

    joinedAt: {
        type: Date,
        default: Date.now,
    },

    lastReadAt: {
        type: Date,
        default: null,
    },

    unreadCount: {
        type: Number,
        default: 0,
    },

}, { _id: false });

const groupConversationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    participants: {
        type: [groupParticipantSchema],
        validate: {
            validator: (v) => v.length >= 2,
            message: "Group must have at least 2 participants",
        },
        required: true,
    },

    avatar: {
        type: String,
        default: null,
    },

    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },

    lastMessageAt: {
        type: Date,
    },

    hiddenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

}, {
    timestamps: true,
});

groupConversationSchema.index({ "participants.userId": 1 });
groupConversationSchema.index({ lastMessageAt: -1 });

export const GroupConversation = mongoose.model("GroupConversation", groupConversationSchema);