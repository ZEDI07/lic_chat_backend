import mongoose from "mongoose";
import { REPORT_TYPE } from "../../config/constant.js";

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    report: { type: mongoose.Schema.Types.ObjectId },
    message: String,
    reportType: {
      type: Number,
      default: REPORT_TYPE.user,
      enum: Object.values(REPORT_TYPE),
    },
  },
  { versionKey: false, timestamps: true }
);

const report = mongoose.model("report", reportSchema);
export default report;
