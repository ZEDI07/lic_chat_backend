import {
  FRIENDSHIP_STATUS,
  GROUP_TYPE,
  ONLINE_PRIVACY,
  PRIVACY_STATUS,
  defaultPeopleImg,
} from "../../config/constant.js";

export const userProject = (extra) => {
  if (extra == undefined) {
    return {
      name: 1,
      avatar: 1,
      email: 1,
      verified: 1,
      active: 1,
      lastActive: 1,
      uid: 1,
      username: 1,
      role: 1,
      about: 1,
      status: 1,
      link: 1,
      type: 1,
      createdAt: 1
    };
  }
  return extra
    ? {
      name: 1,
      avatar: {
        $cond: {
          if: { $eq: ["$privacy.profilePhoto", PRIVACY_STATUS.nobody] },
          then: defaultPeopleImg,
         // else: { $concat: [process.env.IMAGE_URL, "$avatar"] }
          else: "$avatar",
        },
      },
      email: 1,
      verified: 1,
      active: {
        $cond: {
          if: {
            $and: [
              { $eq: ["$privacy.online", ONLINE_PRIVACY.sameAs] },
              { $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody] },
            ],
          },
          then: false,
          else: "$active",
        },
      },
      lastActive: {
        $cond: {
          if: { $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody] },
          then: null,
          else: "$lastActive",
        },
      },
      about: 1,
      role: 1,
      uid: 1,
      username: 1,
      devicetokens: 1,
    }
    : {
      name: 1,
      avatar: {
        $cond: {
          if: {
            $or: [
              {
                $eq: ["$blockedMe", true],
              },
              {
                $eq: ["$privacy.profilePhoto", PRIVACY_STATUS.nobody],
              },
              {
                $and: [
                  {
                    $eq: ["$privacy.profilePhoto", PRIVACY_STATUS.friends],
                  },
                  { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
                ],
              },
            ],
          },
          then: defaultPeopleImg,
          //else: { $concat: [process.env.IMAGE_URL, "$avatar"] }
          else: "$avatar",
        },
      },
      email: 1,
      verified: 1,
      active: {
        $cond: {
          if: {
            $or: [
              {
                $eq: ["$blockedMe", true],
              },
              {
                $and: [
                  {
                    $eq: ["$privacy.online", ONLINE_PRIVACY.sameAs],
                  },
                  {
                    $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody],
                  },
                ],
              },
              {
                $and: [
                  {
                    $eq: ["$privacy.online", ONLINE_PRIVACY.sameAs],
                  },
                  {
                    $eq: ["$privacy.lastSeen", PRIVACY_STATUS.friends],
                  },
                  { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
                ],
              },
            ],
          },
          then: false,
          else: "$active",
        },
      },
      lastActive: {
        $cond: {
          if: {
            $or: [
              {
                $eq: ["$blockedMe", true],
              },
              {
                $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody],
              },
              {
                $and: [
                  {
                    $eq: ["$privacy.lastSeen", PRIVACY_STATUS.friends],
                  },
                  { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
                ],
              },
            ],
          },
          then: null,
          else: "$lastActive",
        },
      },
      uid: 1,
      username: 1,
      role: 1,
      about: {
        $cond: {
          if: {
            $or: [
              {
                $eq: ["$blockedMe", true],
              },
              {
                $eq: ["$privacy.about", PRIVACY_STATUS.nobody],
              },
              {
                $and: [
                  {
                    $eq: ["$privacy.about", PRIVACY_STATUS.friends],
                  },
                  { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
                ],
              },
            ],
          },
          then: null,
          else: "$about",
        },
      },
      status: 1,
      link: 1,
    };
};

// export const userAboutPipeline = [
//   {
//     $lookup: {
//       from: "user_settings",
//       localField: "_id",
//       foreignField: "user",
//       as: "about",
//     },
//   },
//   {
//     $unwind: {
//       path: "$about",
//     },
//   },
//   {
//     $addFields: {
//       about: {
//         $arrayElemAt: [
//           {
//             $filter: {
//               input: "$about.about",
//               as: "aboutObj",
//               cond: {
//                 $eq: ["$$aboutObj.selected", true],
//               },
//             },
//           },
//           0,
//         ],
//       },
//     },
//   },
// ];

export const chatProject = {
  "chat._id": 1,
  "chat.name": 1,
  "chat.avatar": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$blockedMe", true]
          },
          {
            $eq: ["$chat.privacy.profilePhoto", PRIVACY_STATUS.nobody]
          },
          {
            $and: [
              {
                $eq: [
                  "$chat.privacy.profilePhoto",
                  PRIVACY_STATUS.friends
                ]
              },
              { $ne: ["$status", FRIENDSHIP_STATUS.accepted] }
            ]
          }
        ]
      },
      then: defaultPeopleImg,
      //else: { $concat: [process.env.IMAGE_URL, "$chat.avatar"] }
      else: "$chat.avatar"
    }
  },
  "chat.about": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$blockedMe", true]
          },
          {
            $eq: ["$privacy.about", PRIVACY_STATUS.nobody]
          },
          {
            $and: [
              {
                $eq: ["$privacy.about", PRIVACY_STATUS.friends]
              },
              { $ne: ["$status", FRIENDSHIP_STATUS.accepted] }
            ]
          }
        ]
      },
      then: null,
      else: "$chat.about"
    }
  },
  "chat.email": 1,
  "chat.verified": 1,
  "chat.active": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$blockedMe", true]
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.online", ONLINE_PRIVACY.sameAs]
              },
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.nobody]
              }
            ]
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.online", ONLINE_PRIVACY.sameAs]
              },
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.friends]
              },
              {
                $ne: ["$status", FRIENDSHIP_STATUS.accepted]
              }
            ]
          }
        ]
      },
      then: false,
      else: "$chat.active"
    }
  },
  "chat.lastActive": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$blockedMe", true]
          },
          {
            $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.nobody]
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.friends]
              },
              { $ne: ["$status", FRIENDSHIP_STATUS.accepted] }
            ]
          }
        ]
      },
      then: null,
      else: "$chat.lastActive"
    }
  },
  "chat.uid": 1,
  "chat.role": 1,
  "chat.status": 1,
  "chat.link": 1,
  "chat.chatType": "$receiverType",
  "chat.protected": {
    $cond: {
      if: {
        $eq: ["$chat.type", GROUP_TYPE.password_protected]
      },
      then: true,
      else: false
    }
  },
  lastMessage: 1
}

export const userModelProject = {
  name: 1,
  avatar: {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$privacy.profilePhoto", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$privacy.profilePhoto", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: defaultPeopleImg,
      //else: { $concat: [process.env.IMAGE_URL, "$avatar"] }
      else: "$avatar",
    },
  },
  email: 1,
  verified: 1,
  active: {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $and: [
              {
                $eq: ["$privacy.online", ONLINE_PRIVACY.sameAs],
              },
              {
                $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody],
              },
            ],
          },
          {
            $and: [
              {
                $eq: ["$privacy.online", ONLINE_PRIVACY.sameAs],
              },
              {
                $eq: ["$privacy.lastSeen", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: false,
      else: "$active",
    },
  },
  lastActive: {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$privacy.lastSeen", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$privacy.lastSeen", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: null,
      else: "$lastActive",
    },
  },
  uid: 1,
  role: 1,
  about: {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$privacy.about", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$privacy.about", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: null,
      else: "$about",
    },
  },
  status: 1,
  link: 1,
}

export const userchatModelProject = {
  "chat.avatar": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$chat.privacy.profilePhoto", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.profilePhoto", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: defaultPeopleImg,
      //else: { $concat: [process.env.IMAGE_URL, "$chat.avatar"] }
      else: "$chat.avatar"
    },
  },
  "chat.active": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.online", ONLINE_PRIVACY.sameAs],
              },
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.nobody],
              },
            ],
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.online", ONLINE_PRIVACY.sameAs],
              },
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: false,
      else: "$chat.active",
    },
  },
  "chat.lastActive": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.lastSeen", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: null,
      else: "$chat.lastActive",
    },
  },
  "chat.about": {
    $cond: {
      if: {
        $or: [
          {
            $eq: ["$friends.blockedMe", true],
          },
          {
            $eq: ["$chat.privacy.about", PRIVACY_STATUS.nobody],
          },
          {
            $and: [
              {
                $eq: ["$chat.privacy.about", PRIVACY_STATUS.friends],
              },
              { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
            ],
          },
        ],
      },
      then: null,
      else: "$chat.about",
    },
  },
}