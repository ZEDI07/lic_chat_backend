import mongoose from "mongoose";
import { CONTENT_TYPE, FRIENDSHIP_STATUS, GENERAL_SETTING_KEY, GROUP_TYPE, LOCATION_TYPE, MESSAGE_STATUS, RECEIVER_TYPE, USER_STATUS } from "../config/constant.js";
import { handleDeletedMessage, handleDeletedMessageEveryone, } from "../helpers/message.js";
import { chatInfo, deleteChatInfo, findChats, updateChatInfo } from "./chat.js";
import { mediaFilePipeline, messageStatusValuePipeline } from "./pipe/message.js";
import { userProject } from "./pipe/user.js";
import chatDeletedLastMsg from "./schema/chat.js";
import filemanager from "./schema/fileManager.js";
import messageModel from "./schema/message.js";
import messageDeleteModel from "./schema/messageDeleted.js";
import messageReactionModel from "./schema/messageReactions.js";
import messageStarredModel from "./schema/messageStarred.js";
import messageStatusModel from "./schema/messageStatus.js";
import { getGeneralSetting } from "./generalSetting.js";

/**
 * function to create new message for user and group ..
 * @param {*} data
 * @returns
 */
export const createMessage = async (data) => {
  try {
    const messageData = await messageModel.create(data);
    if (messageData) return { success: true, data: messageData };
    return { success: false, message: "error while creating message" };
  } catch (error) {
    console.log("error >>", error);
    return { success: false, message: error.message };
  }
};

export const messagesList = async (req) => {
  try {
    let { limit, lastmessage, sender, receiver } = req.query;
    limit = +limit || 10;
    const senderMatch = [];
    sender &&
      senderMatch.push({ $match: { name: { $regex: sender, $options: "i" } } });
    const receiverMatch = [];
    receiver &&
      receiverMatch.push({
        $match: { name: { $regex: receiver, $options: "i" } },
      });
    let match = {};
    if (lastmessage) {
      match = { _id: { $lt: new mongoose.Types.ObjectId(lastmessage) } };
    }
    const aggregation = [
      {
        $match: { deleted: false, ...match },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
          pipeline: [
            ...senderMatch,
            {
              $project: {
                name: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          as: "receiver",
          let: {
            receiver: "$receiver",
          },
          pipeline: [
            {
              $unionWith: {
                coll: "groups",
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$$receiver", "$_id"],
                },
              },
            },
            ...receiverMatch,
          ],
        },
      },
      {
        $unwind: { path: "$sender", preserveNullAndEmptyArrays: false },
      },
      {
        $unwind: { path: "$receiver", preserveNullAndEmptyArrays: false },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: limit,
      },
      ...mediaFilePipeline,
    ];
    const messages = await messageModel.aggregate(aggregation);
    return { success: true, data: messages };
  } catch (error) {
    console.log("Error in getting message list", error);
    return { success: false, message: error.message };
  }
};

export const messages = async ({
  user,
  chat,
  search,
  lastMessage,
  limit,
  receiverType,
  // messageId,
}) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    chat = new mongoose.Types.ObjectId(chat);
    // messageId && (messageId = new mongoose.Types.ObjectId(messageId));
    if (receiverType == RECEIVER_TYPE.group) {
      const isGroupMember = await chatInfo({
        chat: chat,
        user: user,
        receiverType: RECEIVER_TYPE.group,
        status: { $in: [USER_STATUS.active, USER_STATUS.inactive] },
      });
      if (!isGroupMember)
        return { success: false, message: "You are not a member of group" };
    }
    let match = {
      $or: [
        {
          sender: user,
          receiver: chat,
        },
        {
          sender: chat,
          receiver: user,
        },
      ],
      receiverType: receiverType,
    };
    if (receiverType == RECEIVER_TYPE.group) {
      match = {
        receiver: chat,
        receiverType: receiverType,
      };
    }
    search && (match.text = { $regex: search, $options: "i" });
    // const userPipeline = [
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "sender",
    //       foreignField: "_id",
    //       as: "user",
    //       pipeline: [
    //         {
    //           $lookup: {
    //             from: "friends",
    //             as: "friends",
    //             let: {
    //               user: user,
    //               id: "$_id",
    //             },
    //             pipeline: [
    //               {
    //                 $match: friendMatch,
    //               },
    //             ],
    //           },
    //         },
    //         {
    //           $unwind: {
    //             path: "$friends",
    //             preserveNullAndEmptyArrays: true,
    //           },
    //         },
    //         addBlockFields(user),
    //         {
    //           $project: userProject(false),
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$user",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    // ];
    lastMessage &&
      (match = {
        ...match,
        _id: { $lt: new mongoose.Types.ObjectId(lastMessage) },
      });

    const aggregation = [
      {
        $match: match,
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "_id",
          foreignField: "message",
          as: "message_deleted",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
        },
      },
      {
        $match: {
          message_deleted: {
            $eq: [],
          },
        },
      },
      ...messageStatusValuePipeline(user),
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "mentions",
          foreignField: "_id",
          as: "mentions",
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "message_reactions",
          localField: "_id",
          foreignField: "message",
          as: "reactions",
          pipeline: [
            {
              $match: {
                status: true,
              },
            },
            // {
            //   $lookup: {
            //     from: "reactions",
            //     localField: "reaction",
            //     foreignField: "_id",
            //     as: "reaction",
            //     pipeline: mediaFilePipeline,
            //   },
            // },
            // {
            //   $addFields: {
            //     reaction: {
            //       $first: "$reaction.media",
            //     },
            //   },
            // },
          ],
        },
      },
      // ...userPipeline,
      ...mediaFilePipeline,
      // ...pollPipeline,
      // ...thumbnailFilePipeline,
      // ...storyPipeline,
      {
        $lookup: {
          from: "messages",
          localField: "reply",
          foreignField: "_id",
          pipeline: [
            ...mediaFilePipeline,
            // {
            //   $lookup: {
            //     from: "message_deleteds",
            //     localField: "_id",
            //     foreignField: "message",
            //     as: "message_deleted",
            //     pipeline: [
            //       {
            //         $match: {
            //           user: user,
            //         },
            //       },
            //     ],
            //   },
            // },
            // {
            //   $addFields: {
            //     message_deleted: {
            //       $cond: {
            //         if: {
            //           $or: [
            //             { $ne: [{ $size: "$message_deleted" }, 0] },
            //             "$deleted",
            //           ],
            //         },
            //         then: true,
            //         else: false,
            //       },
            //     },
            //   },
            // },
            // ...userPipeline,
          ],
          as: "reply",
        },
      },
      {
        $unwind: {
          path: "$reply",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $unwind: {
      //     path: "$forward",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "message_starreds",
          localField: "_id",
          foreignField: "message",
          pipeline: [
            {
              $match: {
                user: user,
                status: true,
              },
            },
          ],
          as: "starred",
        },
      },
      // {
      //   $lookup: {
      //     from: "friends",
      //     let: {
      //       user: "$user._id",
      //       friend: user,
      //     },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $or: [
      //               {
      //                 $and: [
      //                   { $eq: ["$sourceId", "$$user"] },
      //                   { $eq: ["$targetId", "$$friend"] },
      //                 ],
      //               },
      //               {
      //                 $and: [
      //                   { $eq: ["$sourceId", "$$friend"] },
      //                   { $eq: ["$targetId", "$$user"] },
      //                 ],
      //               },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "friends",
      //   },
      // },
      // {
      //   $addFields: {
      //     friend: {
      //       $cond: {
      //         if: { $gt: [{ $size: "$friends" }, 0] },
      //         then: { $first: "$friends" },
      //         else: [],
      //       },
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     blocked_me: { $in: [user, "$friend.messageblock"] },
      //   },
      // },
      // {
      //   $addFields: {
      //     "user.avatar": {
      //       $cond: {
      //         if: "$blocked_me",
      //         then: `${currDir}/defaultPeopleAvatar.png`,
      //         else: "$user.avatar",
      //       },
      //     },
      //   },
      // },
      {
        $lookup: {
          from: "calls",
          localField: "_id",
          foreignField: "channel",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
          as: "call",
        },
      },
      {
        $unwind: {
          path: "$call",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          sender: 1,
          receiver: 1,
          originalMedia: 1,
          createdAtMedia: 1,
          action: 1,
          actionUsers: 1,
          mediaSize: 1,
          mentions: 1,
          receiverType: 1,
          contentType: {
            $cond: {
              if: "$deleted",
              then: CONTENT_TYPE.deleted,
              else: "$contentType",
            },
          },
          mediaDetails: 1,
          poll: 1,
          link: 1,
          story: 1,
          edited: 1,
          text: {
            $cond: {
              if: "$deleted",
              then: "This message was deleted",
              else: "$text",
            },
          },
          media: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$media",
            },
          },
          location: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$location",
            },
          },
          contact: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$contact",
            },
          },
          forward: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$forward",
            },
          },
          reply: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$reply",
            },
          },
          fromMe: {
            $cond: {
              if: { $eq: ["$sender", user] },
              then: true,
              else: false,
            },
          },
          deleted: 1,
          createdAt: 1,
          starred: {
            $cond: {
              if: "$deleted",
              then: null,
              else: {
                $cond: {
                  if: {
                    $eq: ["$starred", []],
                  },
                  then: false,
                  else: true,
                },
              },
            },
          },
          status: 1,
          user: 1,
          deletedBy: 1,
          reactions: {
            $cond: {
              if: "$deleted",
              then: null,
              else: "$reactions",
            },
          },
          call: 1,
          startedAt: 1,
          endAt: 1,
          joined: 1
        },
      },
    ];
    const data = await messageModel.aggregate(aggregation);
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateMessage = async (query, update) => {
  try {
    const data = await messageModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (data) return { success: true, data };
    return { success: false, message: "unable to update message" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateMesssages = async (filter, update) => {
  try {
    const data = await messageModel.updateMany(filter, update);
    console.log("messages update response", data)
  } catch (error) {
    console.log('error while updating messages', error)
  }
}

export const messageInfo = async (query) => {
  try {
    const data = await messageModel.findOne(query);
    if (data) return { success: true, data };
    return { success: false, message: "Data not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const findMessages = async (query) => {
  try {
    const data = await messageModel.find(query);
    if (data) {
      return { success: true, data: data };
    }
    return { success: false, message: "Data not found" };
  } catch (error) {
    console.log(error, "error in live loc");
    return { success: false, message: error.message };
  }
};

// export const writeManyMessage = async (data) => {
//   try {
//     let res = await messageModel.bulkWrite(data);
//     console.log(res, "res");
//     return { success: true, res };
//   } catch (error) {
//     return { success: false, message: "Error !!" };
//   }
// };

export const deleteMessage = async (messages, user, chat) => {
  try {
    const chatDetails = await chatInfo({ chat: chat, user: user })
    const update = [];
    let updateLastMessage = false;
    for (let msg of messages) {
      if ((String(msg) == String(chatDetails?.lastMessage._id))) updateLastMessage = true;
      update.push({
        updateOne: {
          filter: {
            message: msg,
            user: user,
          },
          update: {},
          upsert: true,
        },
      });
    }
    await messageDeleteModel.bulkWrite(update);
    console.log('update last message', updateLastMessage)
    if (updateLastMessage) {
      const lastMessage = await chatLastMessage(chatDetails);
      console.log("last Message got", lastMessage);
      chatDetails.lastMessage = lastMessage[0];
      await chatDetails.save();
    }
    handleDeletedMessage(user, { chat: chat, messages: messages });
    return { success: true, message: "Updated Successfully" };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: "error while updating messageStatus" };
  }
};

export const getDeletedMessage = async (query) => {
  try {
    const data = await messageDeleteModel.find(query);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const deleteMessageEveryone = async ({ chat, user, messages }) => {
  try {
    const query = {
      message: { $in: messages },
      user: user,
    };
    const checkDeletedStatus = await getDeletedMessage(query);
    if (!checkDeletedStatus.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "error while fetching message detials" });
    const updateMessages = [];
    for (let msg of messages) {
      if (!checkDeletedStatus.data.some((ele) => ele.message == msg))
        updateMessages.push(
          new Promise(async (res, rej) => {
            try {
              const data = await messageModel.findOneAndUpdate(
                { _id: msg, sender: user, deleted: false },
                { deleted: true, deletedBy: user, status: null },
                { new: true }
              );
              if (data) {
                handleDeletedMessageEveryone(data);
              };
              res("Deleted Successfully");
            } catch (error) {
              rej(error);
            }
          })
        );
    }
    await Promise.all(updateMessages);
    return { success: true, message: "Message deleted from Everyone." };
  } catch (error) {
    console.log("ERROR >>>", error);
    return { success: false, message: error.message };
  }
};

export const deleteConversation = async ({ user, chat, receiverType }) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    chat = new mongoose.Types.ObjectId(chat);
    let match = {
      $or: [
        {
          sender: user,
          receiver: chat,
        },
        {
          sender: chat,
          receiver: user,
        },
      ],
      receiverType: receiverType,
    };
    if (receiverType == RECEIVER_TYPE.group) {
      match = {
        receiver: chat,
        receiverType: receiverType,
      };
    }
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "_id",
          foreignField: "message",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
          as: "deleted",
        },
      },
      {
        $match: {
          deleted: {
            $eq: [],
          },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ];
    const messages = await messageModel.aggregate(aggregation);
    if (!messages.length)
      return { success: false, message: "No Messages found" };
    const writeData = messages.map((message) => ({
      updateOne: {
        filter: {
          message: message._id,
          user: user,
        },
        update: {},
        upsert: true,
      },
    }));
    await messageDeleteModel.bulkWrite(writeData);
    if (receiverType == RECEIVER_TYPE.group) {
      const memberInfo = await chatInfo({
        chat: chat,
        user: user,
        status: USER_STATUS.active,
      });
      if (memberInfo) {
        memberInfo.lastMessage.contentType = CONTENT_TYPE.hidden;
        await memberInfo.save();
      } else await deleteChatInfo({ chat: chat, user: user, receiverType: RECEIVER_TYPE.group })
    } else if (receiverType == RECEIVER_TYPE.user) {
      const friendship = await chatInfo({ chat: chat, user: user, receiverType: RECEIVER_TYPE.user, status: FRIENDSHIP_STATUS.accepted });
      if (friendship) {
        await updateChatInfo({ chat: chat, user: user, receiverType: RECEIVER_TYPE.user, status: FRIENDSHIP_STATUS.accepted }, {
          markUnread: false, unread: 0, archive: false, pin: null, $unset: { lastMessage: "" }
        })
      } else await deleteChatInfo({ chat: chat, user: user, receiverType: RECEIVER_TYPE.user })
    }
    return { success: true, message: "Delete Successfully" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const mediaMesssage = async ({
  user,
  chat,
  chatType,
  contentType,
  lastMessage,
  limit,
  search,
  userDetails,
  global,
}) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    chat = chat && new mongoose.Types.ObjectId(chat);
    const groupConfig = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
    const group = groupConfig?.data?.group?.enabled || false;
    let match = {
      $or: [
        {
          sender: user,
          receiver: chat,
        },
        {
          sender: chat,
          receiver: user,
        },
      ],
      receiverType: group ? chatType : { $ne: RECEIVER_TYPE.group },
    };
    if (chatType && group && (chatType == RECEIVER_TYPE.group))
      match = {
        receiver: chat,
        receiverType: chatType,
      };

    !chat &&
      (match = {
        $or: [
          {
            $and: [
              { $or: [{ sender: user }, { receiver: user }] },
              { receiverType: RECEIVER_TYPE.user }
            ]
          },
          group ? {
            receiverType: RECEIVER_TYPE.group,
            receiver: { $in: (await findChats({ user: user, receiverType: RECEIVER_TYPE.group }, { chat: 1 })).map(group => group.chat) }
          } : {}
        ],
      });

    lastMessage &&
      (match = {
        ...match,
        _id: { $lt: new mongoose.Types.ObjectId(lastMessage) },
      });

    match = {
      ...match,
      deleted: false,
      contentType: {
        $in: contentType,
      },
    };

    search && (match = { ...match, text: { $regex: search, $options: "i" } });

    if (contentType.includes("text")) {
      match["$and"] = [
        {
          link: { $ne: null },
        },
      ];
    }

    const userDetail = [];
    (userDetails || global) &&
      userDetail.push(
        {
          $lookup: {
            from: "users",
            as: "chat",
            localField: "receiver",
            foreignField: "_id",
            pipeline: [
              {
                $match: {
                  ...(global
                    ? { type: { $ne: GROUP_TYPE.password_protected } }
                    : {}),
                },
              },
              { $project: userProject(false) },
            ],
          },
        },
        {
          $unwind: {
            path: "$chat",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            pipeline: [
              {
                $project: userProject(false),
              },
            ],
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        }
      );
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "_id",
          foreignField: "message",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
          as: "message_deleteds",
        },
      },
      {
        $match: {
          message_deleteds: {
            $eq: [],
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: +limit,
      },
      ...userDetail,
      {
        $lookup: {
          from: "message_starreds",
          localField: "_id",
          foreignField: "message",
          pipeline: [
            {
              $match: {
                user: user,
                status: true,
              },
            },
          ],
          as: "starred",
        },
      },
      ...mediaFilePipeline,
      {
        $addFields: {
          starred: {
            $cond: {
              if: {
                $ne: ["$starred", []],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    ];
    const data = await messageModel.aggregate(aggregation);
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.log(error, "error");
    return { success: false, message: error.message };
  }
};

export const messageStarred = async ({ user, messages }) => {
  try {
    const writeOps = [];
    for (let message of messages) {
      writeOps.push({
        updateOne: {
          filter: {
            user: user,
            message: message,
            status: true,
          },
          update: {},
          upsert: true,
        },
      });
    }
    await messageStarredModel.bulkWrite(writeOps);
    return { success: true, message: "starred message" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const messageUnStarred = async ({ user, messages }) => {
  try {
    const writeOps = [];
    for (let message of messages) {
      writeOps.push({
        updateOne: {
          filter: {
            user: user,
            message: message,
            status: true,
          },
          update: {
            status: false,
          },
        },
      });
    }
    await messageStarredModel.bulkWrite(writeOps);
    return { success: true, message: "Message unstarred" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const messageStatusInfo = async ({ user, message }) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    message = new mongoose.Types.ObjectId(message);
    const aggregation = [
      {
        $match: {
          _id: message,
          sender: user,
          deleted: false,
        },
      },
      {
        $lookup: {
          from: "message_statuses",
          localField: "_id",
          foreignField: "message",
          as: "message_statuses",
          pipeline: [
            {
              $match: {
                user: { $ne: user },
              },
            },
            {
              $project: {
                _id: 0,
                user: 1,
                updatedAt: 1,
                status: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: userProject(false),
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: "$status",
                status: {
                  $push: "$$ROOT",
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
          ],
        },
      },
    ];
    const data = await messageModel.aggregate(aggregation);
    if (data.length) {
      return { success: true, data: data[0]?.message_statuses || [] };
    }
    return { success: false, message: "Message info not found" };
  } catch (error) {
    return { success: false, message: error.message };
    ß;
  }
};

export const starredMessages = async ({
  user,
  chat,
  receiverType,
  skip,
  limit,
}) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    chat = new mongoose.Types.ObjectId(chat);
    let match = {
      $or: [
        {
          sender: user,
          receiver: chat,
        },
        {
          sender: chat,
          receiver: user,
        },
        // {
        //   receiver: chat,
        // },
      ],
    };
    if (receiverType == RECEIVER_TYPE.group) {
      match = {
        receiver: chat,
      };
    }
    match = { ...match, receiverType: receiverType, deleted: false };
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "message_starreds",
          localField: "_id",
          foreignField: "message",
          as: "message_starred",
          pipeline: [
            {
              $match: {
                user: user,
                status: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$message_starred",
          preserveNullAndEmptyArrays: false
        },
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "_id",
          foreignField: "message",
          as: "message_deleteds",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
        },
      },
      {
        $match: {
          message_deleteds: { $eq: [] }
        }
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
          pipeline: [
            {
              $project: userProject(),
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "receiver",
          foreignField: "_id",
          as: "receiver",
          pipeline: [
            {
              $project: userProject(),
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$receiver",
          preserveNullAndEmptyArrays: false,
        },
      },
      ...mediaFilePipeline,
      // ...pollPipeline,
      {
        $lookup: {
          from: "messages",
          localField: "reply",
          foreignField: "_id",
          pipeline: [
            ...mediaFilePipeline,
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $addFields: {
                user: { $first: "$user" },
              },
            },
          ],
          as: "reply",
        },
      },
      {
        $unwind: {
          path: "$reply",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "forward",
          foreignField: "_id",
          pipeline: mediaFilePipeline,
          as: "forward",
        },
      },
      {
        $unwind: {
          path: "$forward",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          starred: true,
          starredAt: "$message_starred.updatedAt",
        },
      },
      // {
      //   $lookup: {
      //     from: "friends",
      //     let: {
      //       user: "$sender._id",
      //       friend: user,
      //     },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $or: [
      //               {
      //                 $and: [
      //                   { $eq: ["$sourceId", "$$user"] },
      //                   { $eq: ["$targetId", "$$friend"] },
      //                 ],
      //               },
      //               {
      //                 $and: [
      //                   { $eq: ["$sourceId", "$$friend"] },
      //                   { $eq: ["$targetId", "$$user"] },
      //                 ],
      //               },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "friends",
      //   },
      // },
      // {
      //   $addFields: {
      //     friend: {
      //       $cond: {
      //         if: { $gt: [{ $size: "$friends" }, 0] },
      //         then: { $first: "$friends" },
      //         else: [],
      //       },
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     blocked_me: { $in: [user, "$friend.messageblock"] },
      //   },
      // },
      // {
      //   $addFields: {
      //     "sender.avatar": {
      //       $cond: {
      //         if: "$blocked_me",
      //         then: `${currDir}/defaultPeopleAvatar.png`,
      //         else: "$sender.avatar",
      //       },
      //     },
      //   },
      // },
      {
        $project: {
          sender: "$sender._id",
          receiver: "$receiver._id",
          contentType: 1,
          user: "$sender",
          chat: "$receiver",
          text: 1,
          media: 1,
          mediaDetails: 1,
          reply: 1,
          forward: 1,
          contact: 1,
          location: 1,
          starred: 1,
          createdAt: 1,
          starredAt: 1,
        },
      },
    ];
    const data = await messageModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateMessageStatus = async (query, update) => {
  try {
    const data = await messageStatusModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (data) return { success: true, data: data };
    return { success: false, message: "Error while updating message status" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const messageStatus = async (query) => {
  try {
    const data = await messageStatusModel.find(query);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const chatUnreadMessages = async ({ chat, receiverType, user }) => {
  try {
    chat = new mongoose.Types.ObjectId(chat);
    user = new mongoose.Types.ObjectId(user);
    let match = {
      receiver: user,
      sender: chat,
      receiverType: receiverType,
    };
    if (receiverType == RECEIVER_TYPE.group) {
      match = { receiver: chat, sender: { $ne: user }, receiverType: receiverType };
    }
    match = { ...match, contentType: { $nin: [CONTENT_TYPE.audioCall, CONTENT_TYPE.videoCall] } }
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "message_statuses",
          localField: "_id",
          foreignField: "message",
          as: "message_status",
          pipeline: [
            {
              $match: {
                user: user,
                status: {
                  $lt: MESSAGE_STATUS.seen,
                },
              },
            },
          ],
        },
      },
      {
        $match: {
          message_status: {
            $ne: [],
          },
        },
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "_id",
          foreignField: "message",
          as: "message_deleted",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
        },
      },
      {
        $match: {
          "message_deleted": {
            $eq: [],
          },
        },
      },
      {
        $project: {
          _id: 1,
          sender: 1,
        },
      },
    ];
    const data = await messageModel.aggregate(aggregation);
    // const isBlocked = await friendDetails({
    //   $or: [
    //     { $and: [{ sourceId: user }, { targetId: chat }] },
    //     { $and: [{ sourceId: chat }, { targetId: user }] },
    //   ],
    //   messageblock: { $exists: true, $ne: [] },
    // });
    // console.log(data, "data");
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const bulkWriteMessageStatus = async (writeOps) => {
  try {
    await messageStatusModel.bulkWrite(writeOps);
    return { success: true, message: "success" };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const allMessageSeenStatus = async (message) => {
  try {
    const aggregation = [
      {
        $match: {
          message: {
            $in: message,
          },
        },
      },
      {
        $group: {
          _id: "$message",
          status: {
            $push: {
              $eq: ["$status", MESSAGE_STATUS.seen],
            },
          },
        },
      },
      {
        $project: {
          isAllSeen: {
            $allElementsTrue: ["$status"],
          },
        },
      },
      {
        $match: {
          isAllSeen: true,
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "_id",
          as: "message",
          pipeline: [
            {
              $project: {
                sender: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          message: {
            $first: "$message",
          },
        },
      },
    ];
    const data = await messageStatusModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const reaction = async ({ message, reaction, user }) => {
  try {
    const data = await messageReactionModel.findOneAndUpdate(
      { message, user },
      { reaction, status: true },
      { upsert: true, new: true }
    );
    if (data) return { success: true, data };
    return { success: false, message: "unable to react to message" };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const removeReaction = async ({ message, user }) => {
  try {
    const data = await messageReactionModel.findOneAndUpdate(
      { message, user },
      { status: false },
      { new: true }
    );
    if (data) return { success: true, data };
    return { success: false, message: "Reaction not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const searchMessages = async ({ user, type, text }) => {
  let match = {};
  let query = [];
  if (type !== "text") {
    match = {
      $or: [
        {
          sender: user,
        },
        {
          receiver: user,
        },
      ],
      contentType: type,
      deleted: false,
    };
  } else {
    match = {
      $or: [
        {
          sender: user,
        },
        {
          receiver: user,
        },
      ],
      contentType: type,
      deleted: false,
      text: {
        $regex: text,
        $options: "i",
      },
    };
  }

  try {
    query = [
      {
        $match: match,
      },
      {
        $project: {
          messages: "$$ROOT",
        },
      },
      {
        $facet: {
          groupResult: [
            {
              $match: {
                "messages.receiverType": RECEIVER_TYPE.group,
              },
            },
            {
              $lookup: {
                from: "users",
                let: { senderId: "$messages.sender" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$senderId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                    },
                  },
                ],
                as: "senderDetails",
              },
            },
            {
              $lookup: {
                from: "groups",
                let: { receiverId: "$messages.receiver" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$receiverId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                    },
                  },
                ],
                as: "receiverDetails",
              },
            },
          ],
          userResult: [
            {
              $match: {
                "messages.receiverType": RECEIVER_TYPE.user,
              },
            },
            {
              $lookup: {
                from: "users",
                let: { senderId: "$messages.sender" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$senderId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                    },
                  },
                ],
                as: "senderDetails",
              },
            },
            {
              $lookup: {
                from: "users",
                let: { receiverId: "$messages.receiver" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$receiverId"] },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                    },
                  },
                ],
                as: "receiverDetails",
              },
            },
          ],
        },
      },
      {
        $project: {
          mergedResult: {
            $concatArrays: ["$groupResult", "$userResult"],
          },
        },
      },
    ];

    let response = await messageModel.aggregate(query);

    if (response) {
      return { success: true, data: response };
    } else {
      return { success: true, messsage: "no data found" };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const allstarredMessages = async ({ user, lastMessage, limit }) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    const filterMessage = [];
    if (lastMessage) {
      filterMessage.push({
        $match: {
          message: {
            $lt: new mongoose.Types.ObjectId(lastMessage),
          },
        },
      });
    }
    const aggregate = [
      {
        $match: {
          user: user,
          status: true,
        },
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "message",
          foreignField: "message",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
          as: "deleted",
        },
      },
      {
        $match: {
          deleted: {
            $eq: [],
          },
        },
      },
      ...filterMessage,
      {
        $lookup: {
          from: "messages",
          localField: "message",
          foreignField: "_id",
          as: "message",
          pipeline: [
            {
              $match: {
                deleted: false,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "mentions",
                foreignField: "_id",
                as: "mentions",
                pipeline: [
                  {
                    $project: {
                      name: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $match: {
          message: {
            $ne: [],
          },
        },
      },
      {
        $sort: {
          message: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              {
                $first: "$message",
              },
              {
                starredAt: "$createdAt",
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: userProject(false),
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          as: "chat",
          let: {
            receiver: "$receiver",
          },
          pipeline: [
            {
              $unionWith: {
                coll: "groups",
              },
            },
            {
              $project: userProject(false),
            },
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$receiver"],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$chat",
          preserveNullAndEmptyArrays: false,
        },
      },
      ...mediaFilePipeline,
      // ...pollPipeline,
      {
        $lookup: {
          from: "messages",
          localField: "reply",
          foreignField: "_id",
          as: "reply",
          pipeline: [
            ...mediaFilePipeline,
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                pipeline: [
                  {
                    $project: userProject(false),
                  },
                ],
                as: "user",
              },
            },
            {
              $addFields: {
                user: { $first: "$user" },
              },
            },
          ],
          as: "reply",
        },
      },
      {
        $unwind: {
          path: "$reply",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
    const data = await messageStarredModel.aggregate(aggregate);
    if (data) return { success: true, data };
    return { success: false, message: "Starred messages not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const urlMaker = async (id) => {
  try {
    if (!id) return { success: false, messsage: "required id" };
    const pipleline = [
      {
        $match: {
          _id: id,
          status: true,
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "_id",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                status: true,
              },
            },
            {
              $lookup: {
                from: "storages",
                localField: "serviceId",
                foreignField: "_id",
                pipeline: [
                  {
                    $match: {
                      status: true,
                      enabled: true,
                    },
                  },
                ],
                as: "storages",
              },
            },
            {
              $unwind: {
                path: "$storages",
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          as: "media",
        },
      },
      {
        $unwind: {
          path: "$media",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          media: {
            $concat: ["$media.storages.credentials.cdn_url", "$media.url"],
          },
          mediaDetails: {
            originalname: "$media.originalname",
            createdAtMedia: "$media.createdAt",
            mediaSize: "$media.size",
            mimetype: "$media.mimetype",
          },
        },
      },
    ];
    const media = await filemanager.aggregate(pipleline);
    if (!media.length) {
      return { sucess: false, message: "not found data" };
    }
    return {
      success: true,
      data: media[0],
    };
  } catch (error) {
    console.log(error);
    return { sucess: false, message: "error" };
  }
};

export const allSentMessagesToMe = async (user) => {
  user = new mongoose.Types.ObjectId(user);
  try {
    const data = await messageStatusModel.aggregate([
      {
        $match: {
          user: user,
          status: MESSAGE_STATUS.sent,
        },
      },
      {
        $lookup: {
          from: "message_deleteds",
          localField: "message",
          foreignField: "message",
          as: "deleted",
          pipeline: [
            {
              $match: {
                user: user,
              },
            },
          ],
        },
      },
      {
        $match: {
          deleted: {
            $eq: [],
          },
        },
      },
    ]);
    if (!data) {
      return { success: false, message: "No data" };
    }
    return { success: true, data };
  } catch (error) {
    console.log(error);
    return { success: false, message: error };
  }
};

export const allLiveLocations = async (user) => {
  user = new mongoose.Types.ObjectId(user);
  try {
    let aggregation = [
      {
        $match: {
          sender: user,
          deleted: false,
          contentType: {
            $eq: CONTENT_TYPE.location,
          },
          "location.locationType": { $eq: LOCATION_TYPE.live_location },
          "location.status": { $eq: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "receiver",
          foreignField: "_id",
          pipeline: [
            {
              $project: userProject(false),
            },
          ],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$receiver",
          locations: { $last: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          locations: 1,
        },
      },
      {
        $replaceRoot: { newRoot: "$locations" },
      },
    ];

    const response = await messageModel.aggregate(aggregation);
    if (!response) {
      return { success: false, message: "No Live Locations avaliable" };
    }
    return { success: true, data: response };
  } catch (error) {
    console.log(error);
    return { success: false, message: error };
  }
};

export const handleGroupChatDelete = async ({ lastMessage, user }) => {
  try {
    const data = await chatDeletedLastMsg.findOneAndUpdate(
      {
        sender: user,
        receiver: lastMessage.receiver,
      },
      {
        message: lastMessage._id,
        createdAt: lastMessage.createdAt,
        updatedAt: lastMessage.updatedAt,
      },
      { upsert: true, new: true }
    );
    console.log("Data entry in ChatDelete", data);
    return {
      success: true,
      data: data,
      message: "updated conversation log successfully",
    };
  } catch (error) {
    console.log("error in handle group chat delete", error);
    return { success: false, message: error.messag };
  }
};

export const handleGroupLeave = async ({ user, receiver }) => {
  try {
    const data = await chatDeletedLastMsg.findOneAndDelete({
      sender: user,
      receiver: receiver,
    });
    console.log("delete data>>", data);
    return { success: true, message: "Deleted Successfully" };
  } catch (error) {
    console.log("error in handle group leave", error);
    return { success: false, message: error.messag };
  }
};

export const chatLastMessage = async ({ chat, user, receiverType }) => {
  let match = {
    $or: [
      {
        sender: user,
        receiver: chat,
      },
      {
        sender: chat,
        receiver: user,
      },
    ],
    receiverType: receiverType,
  };
  if (receiverType == RECEIVER_TYPE.group) {
    match = {
      receiver: chat,
      receiverType: receiverType,
    };
  }
  return await messageModel.aggregate([
    {
      $match: match,
    },
    {
      $lookup: {
        from: "message_deleteds",
        localField: "_id",
        foreignField: "message",
        as: "message_deleted",
        pipeline: [
          {
            $match: {
              user: user,
            },
          },
        ],
      },
    },
    {
      $match: {
        message_deleted: {
          $eq: [],
        },
      },
    },
    {
      $sort: {
        _id: -1,
      },
    },
    {
      $limit: 1,
    }
  ])
}