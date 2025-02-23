import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    media: { type: mongoose.Schema.Types.ObjectId, ref: "file" },
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const reaction = mongoose.model("reaction", schema);
export default reaction;
