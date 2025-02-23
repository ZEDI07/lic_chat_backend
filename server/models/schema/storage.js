import mongoose from "mongoose";

const storageSchema = new mongoose.Schema(
  {
    storage: String,
    title: String,
    name: String,
    credentials: {
      accessKeyId: String,
      secretAccessKey: String,
      region: String,
      bucket: String,
      cdn_url: String,
      endpoint_url: String,
      remoteHost: String,
      remotePort: Number,
      username: String,
      password: String,
      path: String,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    default: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false, timestamps: true }
);

storageSchema.index({ _id: 1, status: 1, enabled: 1 });

const storage = mongoose.model("storage", storageSchema);
export default storage;
