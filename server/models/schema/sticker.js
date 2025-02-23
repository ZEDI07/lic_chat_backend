import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    media: { type: mongoose.Schema.Types.ObjectId, ref: "file" },
    category: [
      { type: mongoose.Schema.Types.ObjectId, ref: "sticker_category" },
    ],
    pack: { type: mongoose.Schema.Types.ObjectId, ref: "sticker_pack" },
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const sticker = mongoose.model("sticker", schema);
export default sticker;
