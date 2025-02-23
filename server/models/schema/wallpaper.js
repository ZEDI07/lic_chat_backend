import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    media: { type: mongoose.Schema.Types.ObjectId, ref: "file" },
    startDate: Date,
    endDate: Date,
    status: { type: Boolean, default: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "wallpaper_category" }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const wallpaper = mongoose.model("wallpaper", schema);
export default wallpaper;
