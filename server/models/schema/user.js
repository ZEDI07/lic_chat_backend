import mongoose from "mongoose";
import {
  GROUP_TYPE,
  ONLINE_PRIVACY,
  PRIVACY_STATUS, RECEIVER_TYPE,
  USER_STATUS
} from "../../config/constant.js";


const schema = new mongoose.Schema(
  {
    email: { type: String },
    uid: { type: Number },
    name: { type: String, trim: true, required: true },
    about: { type: String, trim: true },
    number: String,
    receiverType: {
      type: String,
      default: RECEIVER_TYPE.user,
      enum: Object.values(RECEIVER_TYPE),
      required: true
    },
    status: {
      type: Number,
      default: USER_STATUS.active,
      enum: Object.values(USER_STATUS),
    },
    devicetokens: { type: [String], default: undefined },
    language: String,
    address: String,
    dob: Date,
    password: String,
    active: { type: Boolean },
    verified: { type: Boolean },
    lastActive: { type: Date },
    token: String,
    otp: String,
    otpExpiry: Date,
    avatar: {
      type: String,
      //  default: `${currDir}/defaultPeopleAvatar.png` 
    },
    role: {
      type: Number,
      //  default: ROLE_CODE.default 
    },
    tags: String,
    metadata: String,
    link: String,
    timezone: String,
    local: String,
    gender: String,
    first_name: String,
    last_name: String,
    aboutOptions: {
      type: [String],
      // default: DEFAULT_ABOUT
      default: undefined
    },
    notification: {
      conversationTone: {
        type: Boolean
      },
      message: {
        showNotification: {
          type: Boolean,
          // default: true,
        },
        sound: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "file",
        },
        reactionNotification: {
          type: Boolean,
          // default: true,
        },
      },
      group: {
        showNotification: {
          type: Boolean,
          // default: true,
        },
        sound: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "file",
        },
        reactionNotification: {
          type: Boolean,
          // default: true,
        },
      },
      showPreview: {
        type: Boolean,
        // default: true,
      },
    },
    privacy: {
      lastSeen: {
        type: Number,
        enum: Object.values(PRIVACY_STATUS),
        // default: PRIVACY_STATUS.everyone,
      },
      online: {
        type: Number,
        enum: Object.values(ONLINE_PRIVACY),
        // default: ONLINE_PRIVACY.sameAs,
      },
      profilePhoto: {
        type: Number,
        enum: Object.values(PRIVACY_STATUS),
        // default: PRIVACY_STATUS.everyone,
      },
      about: {
        type: Number,
        enum: Object.values(PRIVACY_STATUS),
        // default: PRIVACY_STATUS.everyone,
      },
      group: {
        type: Number,
        enum: [PRIVACY_STATUS.everyone, PRIVACY_STATUS.friends],
        // default: PRIVACY_STATUS.everyone,
      },
      story: {
        type: Number,
        enum: [PRIVACY_STATUS.friends],
        // default: PRIVACY_STATUS.friends,
      },
      call: {
        type: Number,
        enum: [PRIVACY_STATUS.everyone],
        // default: PRIVACY_STATUS.everyone,
      },
      readRecipts: {
        type: Boolean,
        // default: true,
      },
    },
    // name: String,
    // avatar: { type: String, default: `${currDir}/defaultGroupAvatar.png` },
    // link: { type: String, default: uuidv4() },
    type: {
      type: Number,
      enum: Object.values(GROUP_TYPE),
      // default: GROUP_TYPE.public,
    },
    about: String,
    // metadata: String,
    // status: { type: Boolean, default: true },
    // password: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    settings: {
      member: {
        editDetails: {
          type: Boolean,
          // default: false 
        },
        sendMessage: {
          type: Boolean,
          // default: true 
        },
        addMember: {
          type: Boolean,
          //  default: false 
        },
        call: {
          type: Boolean
        }
      },
      admin: {
        approveMember: {
          type: Boolean,
          // default: false 
        },
      },
    },
  },
  { versionKey: false, timestamps: true, strict: false, strictQuery: false, }
);

schema.index({ uid: 1, status: 1 });
schema.index({ _id: 1, status: 1 });
schema.index({ _id: 1, receiverType: 1, status: 1 });
schema.index({ _id: 1, receiverType: 1, status: 1, name: 1 })

// schema.pre(
//   "save",
//   async (next,doc) => {
//     // const doc = this;
//     console.log("new doc create", doc)
//     if (doc.receiverType == RECEIVER_TYPE.user) {
//       doc.avatar ??= defaultPeopleImg;
//       doc.lastActive ??= Date.now()
//       doc.role ??= ROLE_CODE.default;
//       doc.about ??= DEFAULT_ABOUT[0];
//       doc.aboutOptions ??= DEFAULT_ABOUT;
//       doc.active ??= false;
//       doc.verified ??= false;
//       doc.notification ??= {
//         message: {
//           showNotification: true,
//           reactionNotification: true,
//         },
//         group: {
//           showNotification: true,
//           reactionNotification: true,
//         },
//         showPreview: true,
//       }
//       doc.privacy ??= {
//         lastSeen: PRIVACY_STATUS.everyone,
//         online: ONLINE_PRIVACY.sameAs,
//         profilePhoto: PRIVACY_STATUS.everyone,
//         about: PRIVACY_STATUS.everyone,
//         group: PRIVACY_STATUS.everyone,
//         story: PRIVACY_STATUS.friends,
//         call: PRIVACY_STATUS.everyone,
//         readRecipts: true,
//       }
//     } else {
//       doc.avatar ??= defaultGroupImg;
//       doc.type ??= GROUP_TYPE.public;
//       doc.settings ??= {
//         member: {
//           editDetails: false,
//           sendMessage: true,
//           addMember: false,
//         },
//         admin: {
//           approveMember: false,
//         },
//       };
//     }
//     next();
//     // await doc.save();
//     // await user.findOneAndUpdate({ _id: doc._id }, doc)
//   }
// );

const user = mongoose.model("user", schema);
export default user;
