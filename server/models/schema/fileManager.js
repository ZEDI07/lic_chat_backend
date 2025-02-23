import mongoose from "mongoose";

const filemanagerSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Types.ObjectId,
      ref: "storage",
    },
    fileType: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number,
    url: String,
    processed: Boolean,
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

filemanagerSchema.index({ _id: 1, status: 1 });

const filemanager = mongoose.model("file", filemanagerSchema);
export default filemanager;
