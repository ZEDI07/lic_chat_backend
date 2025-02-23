import mongoose from "mongoose";
import { MESSAGE_STATUS } from "../../config/constant.js";

const schema = new mongoose.Schema(
  {
    message: { type: mongoose.Types.ObjectId, ref: "message" },
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    received: { type: Date },
    seen: { type: Date },
    status: {
      type: Number,
      default: MESSAGE_STATUS.sent,
      enum: Object.values(MESSAGE_STATUS),
    },
  },
  { versionKey: false, timestamps: true }
);

schema.index({ message: 1 });
schema.index({ message: 1, user: 1, status: 1 });

const messageStatus = mongoose.model("message_status", schema);
export default messageStatus;
