import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    story: { type: mongoose.Types.ObjectId, required: true, ref: "story" },
    user: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
  },
  { versionKey: false, timestamps: true }
);

schema.index({ user: 1, story: 1 });

const storySeenSchema = mongoose.model("story_seen", schema);

export default storySeenSchema;
