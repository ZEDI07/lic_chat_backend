import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    question: { type: String },
    multiple: { type: Boolean, default: true },
    options: {
      type: [
        {
          _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId(),
          },
          text: {
            type: String,
            required: true,
          },
        },
      ],
    },
  },
  { versionKey: false, timestamps: true }
);

const poll = mongoose.model("poll", schema);
export default poll;
