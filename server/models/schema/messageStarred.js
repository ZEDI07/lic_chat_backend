import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    message: { type: mongoose.Types.ObjectId, ref: "message", required: true },
    user: { type: mongoose.Types.ObjectId, ref: "user", required: true },
    status: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

schema.index({ message: 1, user: 1, status: 1 });
schema.index({ message: -1 })

const messageStarred = mongoose.model("message_starred", schema);
export default messageStarred;
