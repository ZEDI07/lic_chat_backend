import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    media: { type: mongoose.Schema.Types.ObjectId, ref: "file" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "sticker_category" },
    description: String,
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const stickerPack = mongoose.model("sticker_pack", schema);
export default stickerPack;
