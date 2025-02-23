import mongoose from "mongoose";
import permissions from "../../config/permission.js";

const permissionSchema = mongoose.Schema({
  key: String,
  limit: { type: Number, default: null },
});

const roleSchema = new mongoose.Schema(
  {
    roleId: { type: Number, unique: true, required: true },
    name: String,
    description: String,
    status: { type: Boolean, default: true },
    permissions: {
      type: [permissionSchema],
      default: permissions.map((ele) => ({ key: ele.key })),
    },
  },
  { versionKey: false, timestamps: true }
);

roleSchema.index({ roleId: 1 });

const role = mongoose.model("role", roleSchema);
export default role;
