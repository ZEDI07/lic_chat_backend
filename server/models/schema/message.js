import mongoose from "mongoose";
import { CONTENT_TYPE, MESSAGE_STATUS, NOTIFICATION_ACTION, RECEIVER_TYPE } from "../../config/constant.js";

const contactSchema = mongoose.Schema({
  name: String,
  firstName: String,
  lastName: String,
  phoneNumbers: [
    {
      "countryCode": String,
      "number": String,
      "digits": String,
      "label": String,
    },
  ],
  emails: [{
    email: String,
    label: String
  }],
  addresses: Object
});

export const messageSchema = {
  sender: { type: mongoose.Types.ObjectId, required: true, ref: "user" },
  receiver: { type: mongoose.Types.ObjectId, required: true },
  receiverType: {
    type: String,
    enum: Object.values(RECEIVER_TYPE),
    required: true,
  },
  contentType: {
    type: String,
    enum: Object.values(CONTENT_TYPE),
    required: true,
  },
  media: { type: mongoose.Types.ObjectId, ref: "file" },
  reply: { type: mongoose.Types.ObjectId, ref: "message" },
  story: { type: mongoose.Types.ObjectId, ref: "story" },
  forward: { type: Boolean, default: false },
  message: { type: mongoose.Types.ObjectId, ref: "message" },
  poll: { type: mongoose.Types.ObjectId, ref: "poll" },
  text: String,
  action: { type: String, enum: Object.values(NOTIFICATION_ACTION) },
  actionUsers: {
    type: [mongoose.Types.ObjectId],
    ref: "user",
    default: undefined,
  },
  live: Boolean,
  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
      default: undefined
    },
  },
  title: String,
  subTitle: String,
  ended: Boolean,
  endTime: Date,
  link: {
    type: {
      url: String,
      title: String,
      description: String,
      image: String,
    },
    default: undefined,
  },
  contact: { type: [contactSchema], default: undefined },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: mongoose.Types.ObjectId, ref: "user" },
  mentions: {
    type: [mongoose.Types.ObjectId],
    ref: "user",
    default: undefined,
  },
  status: { type: Number, default: MESSAGE_STATUS.sent, enum: Object.values(MESSAGE_STATUS) },
  startedAt: { type: Date },
  endAt: { type: Date },
  joined: { type: Number }
}

const schema = new mongoose.Schema(messageSchema,
  { versionKey: false, timestamps: true }
);

schema.index({ sender: 1, receiver: 1 });
schema.index({ receiver: 1 });
schema.index({ sender: 1, receiver: 1, receiverType: 1 });
schema.index({ receiver: 1, receiverType: 1 });
schema.index({ sender: 1, receiver: 1, contentType: 1 });

const message = mongoose.model("message", schema);

export default message;
