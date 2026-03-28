import mongoose from "mongoose";

const directParticipantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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

const directConversationSchema = new mongoose.Schema({
    participants: {
        type: [directParticipantSchema],
        validate: {
            validator: (v) => v.length === 2,
            message: "Direct conversation must have exactly 2 participants",
        },
        required: true,
    },

   
    directKey: {
        type: String,
        required: true,
        unique: true,
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
    }],

    blockedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

}, {
    timestamps: true,
});

directConversationSchema.index({ directKey: 1 }, { unique: true });
directConversationSchema.index({ "participants.userId": 1 });
directConversationSchema.index({ lastMessageAt: -1 });


export const DirectConversation = mongoose.model("DirectConversation", directConversationSchema);

