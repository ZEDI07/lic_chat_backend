import mongoose from "mongoose";

const chatWallpaperSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    wallpaper: { type: mongoose.Schema.Types.ObjectId, ref: "wallpapers" },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
);

chatWallpaperSchema.index({ chat: 1, user: 1, status: 1 });

const chatWallpapers = mongoose.model("chat_wallpapers", chatWallpaperSchema);
export default chatWallpapers;
