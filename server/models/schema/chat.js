import mongoose from "mongoose";
import { FRIENDSHIP_STATUS, MEMBER_GROUP_ROLE, RECEIVER_TYPE } from "../../config/constant.js";
import { messageSchema } from "./message.js";

const schema = new mongoose.Schema(
  {
    chat: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
    user: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
    receiverType: { type: String, enum: Object.values(RECEIVER_TYPE), required: true },
    lastMessage: {
      type: {
        _id: { type: mongoose.Types.ObjectId, required: true, ref: "message" },
        ...messageSchema,
        createdAt: { type: Date, required: true },
        updatedAt: { type: Date, required: true },
      },
      default: undefined
    },
    pin: { type: Date },
    mute: { type: Boolean, default: false },
    muteTill: { type: Date },
    archive: { type: Boolean, default: false },
    unread: { type: Number, default: 0 },
    markUnread: { type: Boolean, default: false },
    blocked: { type: Boolean },
    blockedMe: { type: Boolean },
    status: { type: Number, default: FRIENDSHIP_STATUS.active, enum: Object.values(FRIENDSHIP_STATUS), required: true },
    role: { type: Number, enum: Object.values(MEMBER_GROUP_ROLE) }
  },
  { timestamps: true, versionKey: false }
);

schema.index({ user: 1, archive: 1, receiverType: 1, lastMessage: 1 });
schema.index({ pin: -1, "lastMessage._id": -1, "chat": -1 });
schema.index({ chat: 1, user: 1, receiverType: 1, });
schema.index({ chat: -1, user: -1, receiverType: 1, "lastMessage._id": -1 })
schema.index({ "user": 1, "archive": 1, "unread": 1, "markUnread": 1 })

const chat = mongoose.model("chat", schema);
export default chat;
