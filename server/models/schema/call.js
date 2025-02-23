import mongoose from "mongoose";
import {
  CALL_MODE,
  CALL_STATUS,
  CALL_TYPE,
  RECEIVER_TYPE,
} from "../../config/constant.js";

const schema = new mongoose.Schema(
  {
    channel: { type: mongoose.Types.ObjectId, ref: "message", required: true },
    chat: { type: mongoose.Types.ObjectId, ref: "user", required: true },
    user: { type: mongoose.Types.ObjectId, required: true },
    receiverType: { type: String, enum: Object.keys(RECEIVER_TYPE) },
    callType: { type: String, enum: Object.keys(CALL_TYPE), required: true },
    callMode: { type: String, enum: Object.values(CALL_MODE) },
    joined: { type: Boolean, default: false },
    startedAt: { type: Date },
    disconnectAt: { type: Date },
    token: String,
    status: {
      type: Number,
      default: CALL_STATUS.initiated,
      enum: Object.values(CALL_STATUS),
    },
    deleted: {
      type: Boolean,
      default: false,
    }
  },
  { versionKey: false, timestamps: true }
);

schema.index({ channel: 1 });
schema.index({ channel: 1, user: 1 });
schema.index({ user: 1, deleted: 1 });
schema.index({ user: 1, deleted: 1, _id: -1 });

const calls = mongoose.model("call", schema);
export default calls;
