import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    clientSecret: String,
    enabled: { type: Boolean, default: true },
    status: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

const apicredentials = mongoose.model("api_credential", schema);
export default apicredentials;
