import mongoose from "mongoose";
import { CONTENT_TYPE, FRIENDSHIP_STATUS, GENERAL_SETTING_KEY, GROUP_TYPE, MESSAGING_SETTING, ONLINE_PRIVACY, PRIVACY_STATUS, RECEIVER_TYPE, USER_STATUS, VIEW_MORE, defaultPeopleImg } from "../config/constant.js";
import { handleChatBlock } from "../helpers/chat.js";
import { chatProject, userProject } from "./pipe/user.js";
import ChatModel from "./schema/chat.js";
import chatWallpapers from "./schema/chatWallpaper.js";
import MessageModel from "./schema/message.js";
import { userInfo } from "./user.js";
import { getGeneralSetting, getMessagingSetting } from "./generalSetting.js";

// Write Mutliple chats at a time .
export const chatBulkWrite = async (data) => {
  try {
    await ChatModel.bulkWrite(data)
    return true;
  } catch (error) {
    console.log("chat builk error", error)
    return false
  }
}

// get single chat detils
export const chatInfo = async (query, projection) => {
  return await ChatModel.findOne(query, projection)
}

// update multiple chats details
export const updateChatsInfo = async (query, update) => {
  return await ChatModel.updateMany(query, update)
}

// count chats 
export const chatCount = async (query) => await ChatModel.countDocuments(query);

// find multiple chats details.
export const findChats = async (query, projection) => await ChatModel.find(query, projection);

// update a details of a chat. 
export const updateChatInfo = async (filter, update, options = { new: true }) => await ChatModel.findOneAndUpdate(filter, update, options);

export const deleteChatInfo = async (filter) => await ChatModel.findOneAndDelete(filter);

// To Archive Chat .
export const archive = async ({ user, chats, archive }) => {
  try {
    const writeOps = [];
    for (let chat of chats) {
      writeOps.push({
        updateOne: {
          filter: {
            user,
            chat,
          },
          update: {
            archive: archive,
          },
        },
      });
    }
    await chatBulkWrite(writeOps)
    return { success: true, messsgae: "archived chat" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const chatSearch = async ({
  user,
  text,
  lastMessage,
  limit,
  lastChat,
  more,
}) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    const groupConfig = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
    const group = groupConfig?.data?.group?.enabled || false;
    let messageFilter = {};
    lastMessage &&
      (messageFilter = {
        _id: {
          $lt: new mongoose.Types.ObjectId(lastMessage),
        },
      });

    let messageFacet = {
      messages: [
        {
          $limit: limit,
        },
      ],
      starred: [
        {
          $lookup: {
            from: "message_starreds",
            localField: "_id",
            foreignField: "message",
            as: "starredMessages",
            pipeline: [
              {
                $match: {
                  user: user,
                  status: true,
                }
              }
            ]
          }
        },
        {
          $match: {
            starredMessages: {
              $ne: []
            }
          }
        },
        {
          $limit: limit
        },
      ]
    };
    const chatsPipeline = [
      {
        $match: {
          user: user,
          ...group ? {} : { receiverType: { $ne: RECEIVER_TYPE.group } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "chat",
          foreignField: "_id",
          as: "chat",
          pipeline: [
            {
              $match: {
                name: {
                  $regex: text,
                  $options: "i",
                },
              }
            }
          ]
        },
      },
      {
        $match: {
          "chat": {
            $ne: []
          }
        }
      },
      {
        $unwind: {
          path: "$chat",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          "chat.name": -1,
        },
      },
      {
        $skip: lastChat * (limit - 1)
      },
      {
        $limit: limit
      },
      {
        $project: chatProject
      }
    ];
    const messagesPipeline = [
      {
        '$match': {
          ...messageFilter,
          'contentType': CONTENT_TYPE.text,
          'text': {
            '$regex': text,
            '$options': 'i'
          },
          'deleted': false,
          '$or': [
            ...group ? [{
              'receiverType': 'group',
              receiver: { $in: (await findChats({ user: user, receiverType: RECEIVER_TYPE.group }, { chat: 1 })).map(group => group.chat) }
            }] : [],
            {
              '$or': [
                {
                  'sender': user
                }, {
                  'receiver': user
                }
              ],
              'receiverType': 'user'
            }
          ]
        }
      }, {
        '$lookup': {
          'from': 'message_deleteds',
          'localField': '_id',
          'foreignField': 'message',
          'as': 'deleted',
          'pipeline': [
            {
              '$match': {
                'user': user
              }
            }
          ]
        }
      }, {
        '$match': {
          'deleted': {
            '$eq': []
          }
        }
      },
      {
        $addFields: {
          chat: {
            $cond: {
              if: {
                $eq: ["$receiverType", RECEIVER_TYPE.group]
              },
              then: "$receiver",
              else: {
                $cond: {
                  if: { $eq: ["$sender", user] },
                  then: "$receiver",
                  else: "$sender"
                }
              }
            }
          }
        }
      },
      {
        '$lookup': {
          'from': 'users',
          'localField': 'chat',
          'foreignField': '_id',
          'as': 'chat',
          'pipeline': [
            {
              '$match': {
                'type': { $ne: GROUP_TYPE.password_protected },
                status: USER_STATUS.active
              }
            },
            {
              $project: {
                ...userProject(),
                chatType: "$receiverType",
              }
            }
          ]
        }
      }, {
        '$unwind': {
          'path': '$chat',
          'preserveNullAndEmptyArrays': false
        }
      }, {
        $sort: {
          _id: -1
        }
      },
      {
        $facet: messageFacet
      }
    ];
    let pipelines = [await ChatModel.aggregate(chatsPipeline), await MessageModel.aggregate(messagesPipeline)]

    if (more)
      switch (more) {
        case VIEW_MORE.chats:
          const chatData = await ChatModel.aggregate(chatsPipeline);
          return {
            success: true,
            data: { chats: chatData },
          };
        case VIEW_MORE.messages:
          delete messageFacet.starred;
          const messageData = await MessageModel.aggregate(messagesPipeline);
          return {
            success: true,
            data: { messages: messageData[0].messages },
          }
          break;
        case VIEW_MORE.starred:
          delete messageFacet.messages;
          const starredDat = await MessageModel.aggregate(messagesPipeline);
          return {
            success: true,
            data: {
              starred: starredDat[0].starred
            }
          }
      }
    else {
      const [chats, messages] = await Promise.all(pipelines);
      const data = { chats: chats, messages: messages[0].messages, starred: messages[0].starred }
      return {
        success: true,
        data: data,
      };
    }
  } catch (error) {
    console.log(error);
    return { success: false, message: error };
  }
};

// export const unreadInfo = async (query) => await chatUnreadModel.findOne(query);

export const updateChatWallpaper = async (filter, update, options) => {
  try {
    const response = await chatWallpapers.findOneAndUpdate(
      filter,
      update,
      options
    );
    if (!response)
      return { success: false, message: "Something went wrong while updating" };
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateManyChatWallpaper = async (filter, update, options) => {
  try {
    const response = await chatWallpapers.updateMany(filter, update, options);
    if (!response)
      return { success: false, message: "Something went wrong while updating" };

    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const chats = async ({ user, limit, archive, lastMessage, chat }) => {
  const match = {
    user: user
  };
  archive !== undefined && (match.archive = archive);
  lastMessage && (match["lastMessage._id"] = {
    $lt: new mongoose.Types.ObjectId(lastMessage),
  })
  chat ? (match.chat = new mongoose.Types.ObjectId(chat)) : match["$or"] = [
    { lastMessage: { $exists: true } },
    { receiverType: RECEIVER_TYPE.group }
  ];
  const messagingSetting = await getMessagingSetting();
  if (messagingSetting == MESSAGING_SETTING.everyone && chat) {
    const chats = await ChatModel.findOne({ user: user, chat: chat });
    if (!chats) {
      const writeOps = [];
      writeOps.push({
        updateOne: {
          filter: {
            user: user,
            chat: chat,
          },
          update: {
            $setOnInsert: {
              status: FRIENDSHIP_STATUS.accepted, // byDefault was FRIENDSHIP_STATUS.unknown , changed to create every user freind , that will impact in (pin/block/search)
              receiverType: RECEIVER_TYPE.user,
              mute: false,
              archive: false,
              unread: 0,
              markUnread: false,
              blocked: false,
              blockedMe: false
            },
          },
          upsert: true,
        }
      }, {
        updateOne: {
          filter: {
            user: chat,
            chat: user,
          },
          update: {
            $setOnInsert: {
              status: FRIENDSHIP_STATUS.accepted, // byDefault was FRIENDSHIP_STATUS.unknown , changed to create every user freind , that will impact in (pin/block/search)
              receiverType: RECEIVER_TYPE.user,
              mute: false,
              archive: false,
              unread: 0,
              markUnread: false,
              blocked: false,
              blockedMe: false
            },
          },
          upsert: true,
        }
      });
      const response = await chatBulkWrite(writeOps);
      console.log("bulkwrite response", response)
    }
  }
  const groupEnabled = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
  if ((groupEnabled.success && !groupEnabled.data.group.enabled) || !groupEnabled.success) {
    match.receiverType = { $ne: RECEIVER_TYPE.group }
  }
  const aggregation = [
    {
      $match: match
    },
    ...limit ? [{
      $sort: {
        pin: -1,
        "lastMessage._id": -1,
        chat: -1
      }
    }, { $limit: limit }] : [],
    {
      $lookup: {
        from: "users",
        localField: "chat",
        foreignField: "_id",
        as: "chat",
        pipeline: [
          { $project: { ...userProject(), chatType: "$receiverType", privacy: 1 } }
        ]
      }
    },
    {
      $unwind: {
        path: "$chat",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $addFields: {
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
            else: "$chat.avatar"
            // else: {
            //   $cond:{
            //     if:{
            //       $eq:["$chat.chatType", RECEIVER_TYPE.group]
            //     },
            //     then : "$chat.avatar",
            //     else: { $concat: [process.env.IMAGE_URL, "$chat.avatar"] }
            //   }
            // }
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
                  $eq: ["$chat.privacy.about", PRIVACY_STATUS.nobody]
                },
                {
                  $and: [
                    {
                      $eq: ["$chat.privacy.about", PRIVACY_STATUS.friends]
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
        "chat.protected": {
          $cond: {
            if: {
              $eq: ["$chat.type", GROUP_TYPE.password_protected]
            },
            then: true,
            else: false
          }
        },
        // "chat._id": 1,
        // "chat.email": 1,
        // "chat.uid": 1,
        // "chat.name": 1,
        // "chat.verified": 1,
        // "chat.link": 1,
        // "chat.chatType": 1
        "chat.privacy": undefined,
        "chat.createdAt": {
          $cond: {
            if: {
              $eq: ["$chat.receiverType", RECEIVER_TYPE.user]
            },
            then: '$createdAt',
            else: "$chat.createdAt"
          }
        }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "lastMessage.mentions",
        foreignField: "_id",
        as: "lastMessage.mentions"
      }
    },
    {
      $project: {
        chat: 1,
        archive: 1,
        mute: 1,
        pin: 1,
        blocked: 1,
        blockedMe: 1,
        lastMessage: 1,
        _id: 0,
        unread: {
          $cond: {
            if: "$markUnread",
            then: -1,
            else: "$unread"
          }
        }
      }
    }
  ];
  return await ChatModel.aggregate(aggregation)
}

export const blockChat = async ({ user, chat, status }) => {
  try {
    await updateChatInfo({ chat: chat, user: user._id }, { blocked: status });
    const updatedInfo = await updateChatInfo({ chat: user._id, user: chat }, { blockedMe: status });
    const data = status ? {
      "active": false,
      "verified": false,
      "avatar": defaultPeopleImg,
      "about": null,
      "lastActive": null
    } : {
      "active": user.active,
      "verified": user.verified,
      "avatar": user.avatar,
      "about": user.about,
      "lastActive": user.lastActive
    }
    let receiver = await userInfo({ _id: chat });
    receiver = { ...updatedInfo.toJSON(), ...receiver.data.toJSON() }
    handleChatBlock({ user, chat: receiver, status: status, data })
  } catch (error) {
    console.log("error while handle", error)
  }
}