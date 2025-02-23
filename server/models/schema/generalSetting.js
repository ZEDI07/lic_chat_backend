import mongoose from "mongoose";
import { CONTENT_TYPE, GENERAL_SETTING_KEY, MESSAGING_SETTING } from "../../config/constant.js";

const schema = new mongoose.Schema(
  {
    key: { type: String, enum: Object.values(GENERAL_SETTING_KEY) },
    quality: Number,
    oneSignal: {
      id: String,
      key: String,
    },
    domain: String,
    messaging_setting: { type: Number, enum: Object.values(MESSAGING_SETTING) },
    password: String,
    enabled: Boolean,
    agora: {
      id: String,
      certificate: String
    },
    auto_delete_attachment: {
      status: Boolean,
      day: {
        type: Number,
      },
      contentType: {
        type: Array,
        default: undefined
      },
    },
    group: {
      enabled: Boolean,
    },
    lastDeletedAt: Date
  },
  { versionKey: false, timestamps: true }
);

const generalSetting = mongoose.model("general_setting", schema);
export default generalSetting;
