import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    key: { type: String },
    default: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const language = mongoose.model("language", schema);
export default language;
