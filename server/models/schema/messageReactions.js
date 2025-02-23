import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    message: { type: mongoose.Types.ObjectId, required: true, ref: "message" },
    reaction: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "reaction",
    },
    user: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
    status: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

schema.index({ message: 1, status: 1 });

const messageReaction = mongoose.model("message_reaction", schema);
export default messageReaction;
