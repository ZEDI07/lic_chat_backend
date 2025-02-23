import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    color: String,
    startDate: Date,
    endDate: Date,
    media: { type: mongoose.Schema.Types.ObjectId, ref: "file" },
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const wallpaperCategory = mongoose.model("wallpaper_category", schema);
export default wallpaperCategory;
