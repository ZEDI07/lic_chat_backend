import mongoose from "mongoose";
import { SHOW_STORIES, STORIES_CONTENT_TYPE } from "../../config/constant.js";

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
    contentType: {
      type: String,
      enum: Object.keys(STORIES_CONTENT_TYPE),
      required: true,
    },
    media: { type: mongoose.Types.ObjectId, ref: "file" },
    text: String,
    status: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    show: {
      type: String,
      enum: Object.keys(SHOW_STORIES),
      required: true,
    },
  },
  { versionKey: false, timestamps: true }
);

schema.index({ user: 1 });

const storiesSchema = mongoose.model("stories", schema);

export default storiesSchema;
