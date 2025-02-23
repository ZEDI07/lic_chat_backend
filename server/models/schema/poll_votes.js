import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    option: { type: mongoose.Schema.Types.ObjectId },
    message: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    status: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true }
);

const pollVotes = mongoose.model("poll_vote", schema);
export default pollVotes;
