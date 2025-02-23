import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    message: { type: mongoose.Types.ObjectId, required: true },
    user: { type: mongoose.Types.ObjectId, required: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

schema.index({ message: 1, user: 1 });

const messageDeleted = mongoose.model("message_deleted", schema);
export default messageDeleted;
