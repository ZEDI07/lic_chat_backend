import mongoose from "mongoose";
import { FRIENDSHIP_STATUS, ONLINE_PRIVACY, PRIVACY_STATUS, RECEIVER_TYPE, USER_STATUS, defaultPeopleImg } from "../config/constant.js";
import { chatBulkWrite, updateChatsInfo } from "./chat.js";
import { chatProject, userProject } from "./pipe/user.js";
import ChatModel from "./schema/chat.js";
import reportSchema from "./schema/report.js";
import UserModel from "./schema/user.js";

export const addUserFriend = async ({ user, users, status }) => {
  try {
    const writeOps = [];
    for (let addUser of users) {
      writeOps.push(
        {
          updateOne: {
            filter: {
              user: user,
              chat: addUser,
            },
            update: {
              $set: {
                status: status || USER_STATUS.active,
              },
              $setOnInsert: {
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
        },
        {
          updateOne: {
            filter: {
              user: addUser,
              chat: user,
            },
            update: {
              $set: {
                status: status || USER_STATUS.active,
              },
              $setOnInsert: {
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
        }
      );
    }
    const response = await chatBulkWrite(writeOps)
    if (response)
      return {
        success: true,
        message: "Friend added successfully",
      };
    return { success: false, message: "unable to add friends" };
  } catch (error) {
    console.log("error while adding user friend.", error);
    return { success: false, message: "error while adding user friend." };
  }
};

// // to be reviewed
export const friendList = async ({ user }, selfOut = false) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    const filterSelf = [];
    selfOut &&
      filterSelf.push({
        $match: {
          friendDetails: { $ne: user },
        },
      });
    const aggregation = [
      {
        $match: {
          chat: user,
          status: FRIENDSHIP_STATUS.accepted,
          receiverType: RECEIVER_TYPE.user
        },
      },
      // {
      //   $addFields: {
      //     friend: {
      //       $cond: {
      //         if: { $eq: [user, "$sourceId"] },
      //         then: "$targetId",
      //         else: "$sourceId",
      //       },
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     except: {
      //       $cond: {
      //         if: {
      //           $and: ["$except", { $in: ["$friend", "$except"] }],
      //         },
      //         then: true,
      //         else: false,
      //       },
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     blocked: {
      //       $cond: {
      //         if: { $in: ["$friend", "$messageblock"] },
      //         then: true,
      //         else: false,
      //       },
      //     },
      //   },
      // },
      ...filterSelf,
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "friendDetails",
          pipeline: [
            { $project: userProject() },
            // {
            //   $match: search ? { name: { $regex: search, $options: "i" } } : {},
            // },
          ],
        },
      },
      {
        $unwind: {
          path: "$friendDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          "friendDetails.createdAt": "$createdAt",
        },
      },
      // {
      //   $addFields: {
      //     "friendDetails.blocked": "$blocked",
      //   },
      // },
      // {
      //   $addFields: {
      //     "friendDetails.except": "$except",
      //   },
      // },
      // {
      //   $addFields: {
      //     "friendDetails._id": "$_id",
      //     "friendDetails.userId": "$friendDetails._id",
      //   },
      // },
      {
        $replaceRoot: { newRoot: "$friendDetails" },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];
    const data = await ChatModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    console.log("error while getting user friendlist", error);
    return { success: false, message: "Error while getting user friend list." };
  }
};

export const updateFriend = async (query, update) => {
  try {
    const data = await updateChatsInfo(query, update);
    if (data)
      return { success: true, message: "Updated Successfully", data: data };
    return { success: false, message: "all ready blocked" };
  } catch (error) {
    return { success: false, message: "Error while update status" };
  }
};

// export const writeManyFriend = async (operation) => {
//   try {
//     await friendModel.bulkWrite(operation);
//     return { success: true, message: "operation completed" };
//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// };

// export const friendDetails = async (filter) => {
//   try {
//     const data = await friendModel.findOne(filter);
//     if (data) return { success: true, data };
//     return { success: false, message: "No Details found." };
//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// };

export const activeFriends = async ({ user, skip, limit }) => {
  try {
    const stages = [];
    if (skip && limit) {
      stages.push({ $skip: skip }, { $limit: limit });
    }
    user = new mongoose.Types.ObjectId(user);
    const aggregation = [
      {
        $match: {
          active: true,
          status: USER_STATUS.active,
          receiverType: RECEIVER_TYPE.user,
          _id: { $ne: user },
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "chat",
          as: "friends",
          pipeline: [
            {
              $match: {
                user: user,
                status: FRIENDSHIP_STATUS.accepted,
                blockedMe: false
              }
            }
          ]
        }
      }, {
        $unwind: {
          path: "$friends",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $facet: {
          users: [
            ...stages,
            {
              $project: {
                name: 1,
                avatar: {
                  $cond: {
                    if: {
                      $or: [
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
                chatType: "$receiverType"
              }
            },
          ],
          count: [{ $count: "count" }],
        },
      },
      {
        $unwind: {
          path: "$count",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          count: "$count.count",
        },
      },
    ];
    const data = await UserModel.aggregate(aggregation);
    return { success: true, data: data[0].users, count: data[0].count || 0 };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const reportFriend = async (
  user,
  report,
  message,
  reportType,
  block,
  leave
) => {
  try {
    let data = await reportSchema.create({
      user,
      report,
      message,
      reportType,
    });
    if (!data)
      return { success: false, message: "somthing went wrong while reporting" };

    if (data && block) {
      // perform block operation
    }
    if (data && leave) {
      // perform group leaving operation
    }

    if (data) return { success: true, message: "repoted Successfully" };
    return { success: false, message: "somthing went wrong while reporting" };
  } catch (error) {
    return { success: false, message: "Error while reporting status" };
  }
};

export const allBlockedFriends = async ({ user }) => {
  user = new mongoose.Types.ObjectId(user);
  try {
    const aggregation = [
      {
        $match: {
          $or: [{ sourceId: user._id }, { targetId: user._id }],
          status: FRIENDSHIP_STATUS.accepted,
          $and: [
            { messageblock: { $ne: user._id } },
            { messageblock: { $ne: [] } },
          ],
        },
      },
      {
        $addFields: {
          friendId: {
            $cond: {
              if: { $ne: ["$sourceId", user._id] },
              then: "$sourceId",
              else: "$targetId",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "friendId",
          foreignField: "_id",
          pipeline: [{ $project: userProject() }],
          as: "friend",
        },
      },
      {
        $project: {
          friend: 1,
        },
      },
      {
        $unwind: {
          path: "$friend",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: { newRoot: "$friend" },
      },
    ];

    const response = [] //await friendModel.aggregate(aggregation);
    if (!response) {
      return { success: false, message: "No data" };
    }
    return { success: true, data: response };
  } catch (error) {
    console.log(error, "findFriend");
    return { success: false, message: error.message };
  }
};

// export const chatDetails = async ({ user, chat }) => {
//   try {
//     chat = new mongoose.Types.ObjectId(chat);
//     const aggregation = [
//       {
//         $match: {
//           $or: [
//             {
//               sourceId: user,
//               targetId: chat,
//             },
//             {
//               sourceId: chat,
//               targetId: user,
//             },
//           ],
//           status: FRIENDSHIP_STATUS.accepted,
//         },
//       },
//       {
//         $unionWith: {
//           coll: "groups",
//           pipeline: [
//             {
//               $match: {
//                 _id: chat,
//                 status: true,
//               },
//             },
//             {
//               $lookup: {
//                 from: "group_users",
//                 localField: "_id",
//                 foreignField: "group",
//                 as: "group_users",
//                 pipeline: [
//                   {
//                     $match: {
//                       user: user,
//                       status: USER_STATUS.active,
//                     },
//                   },
//                 ],
//               },
//             },
//             {
//               $match: {
//                 group_users: {
//                   $ne: [],
//                 },
//               },
//             },
//           ],
//         },
//       },
//       {
//         $addFields: {
//           chat: {
//             $switch: {
//               branches: [
//                 {
//                   case: {
//                     $eq: ["$sourceId", user],
//                   },
//                   then: "$targetId",
//                 },
//                 {
//                   case: {
//                     $eq: ["$targetId", user],
//                   },
//                   then: "$sourceId",
//                 },
//               ],
//               default: "$_id",
//             },
//           },
//         },
//       },
//       {
//         $match: {
//           chat: new mongoose.Types.ObjectId(chat),
//         },
//       },
//       {
//         $lookup: {
//           from: "chat_archives",
//           localField: "chat",
//           foreignField: "chat",
//           as: "archive",
//           pipeline: [
//             {
//               $match: {
//                 user: user,
//                 status: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "chat_unreads",
//           localField: "chat",
//           foreignField: "chat",
//           as: "mark_unread",
//           pipeline: [
//             {
//               $match: {
//                 user: user,
//                 status: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "messages",
//           as: "messages",
//           let: {
//             id: "$_id",
//             sourceId: "$sourceId",
//             targetId: "$targetId",
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $or: [
//                     {
//                       $and: [
//                         {
//                           $eq: ["$sender", "$$sourceId"],
//                         },
//                         {
//                           $eq: ["$receiver", "$$targetId"],
//                         },
//                       ],
//                     },
//                     {
//                       $and: [
//                         {
//                           $eq: ["$sender", "$$targetId"],
//                         },
//                         {
//                           $eq: ["$receiver", "$$sourceId"],
//                         },
//                       ],
//                     },
//                     {
//                       $eq: ["$receiver", "$$id"],
//                     },
//                   ],
//                 },
//               },
//             },
//             {
//               $lookup: {
//                 from: "message_deleteds",
//                 localField: "_id",
//                 foreignField: "message",
//                 as: "message_deleted",
//                 pipeline: [
//                   {
//                     $match: {
//                       user: user,
//                     },
//                   },
//                 ],
//               },
//             },
//             {
//               $match: {
//                 message_deleted: {
//                   $eq: [],
//                 },
//               },
//             },
//             {
//               $project: {
//                 deleted: 1,
//                 contentType: 1,
//                 text: 1,
//                 createdAt: 1,
//                 sender: 1,
//                 media: 1,
//                 location: 1,
//                 contact: 1,
//               },
//             },
//             {
//               $sort: {
//                 _id: -1,
//               },
//             },
//             {
//               $lookup: {
//                 from: "message_statuses",
//                 localField: "_id",
//                 foreignField: "message",
//                 as: "message_status",
//               },
//             },
//             // {
//             //   $match: {
//             //     message_status: {
//             //       $ne: [],
//             //     },
//             //   },
//             // },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "chat_pins",
//           localField: "chat",
//           foreignField: "chat",
//           as: "pin",
//           pipeline: [
//             {
//               $match: {
//                 user: user,
//                 status: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $unwind: {
//           path: "$pin",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           name: 1,
//           avatar: 1,
//           chat: 1,
//           messageblock: {
//             $ifNull: ["$messageblock", []],
//           },
//           pin: 1,
//           type: 1,
//           messages: 1,
//           active: 1,
//           lastActive: 1,
//           mark_unread: 1,
//           lastMessage: {
//             $first: "$messages",
//           },
//           archive: {
//             $cond: {
//               if: { $ne: ["$archive", []] },
//               then: true,
//               else: false,
//             },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "chat_mutes",
//           localField: "chat",
//           foreignField: "chat",
//           as: "mute",
//           pipeline: [
//             {
//               $match: {
//                 user: user,
//                 status: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "lastMessage.sender",
//           foreignField: "_id",
//           as: "user",
//           pipeline: [
//             {
//               $project: userProject(false),
//             },
//           ],
//         },
//       },
//       {
//         $addFields: {
//           blocked: {
//             $cond: {
//               if: {
//                 $in: ["$chat", "$messageblock"],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           blockedMe: {
//             $cond: {
//               if: {
//                 $in: [user, "$messageblock"],
//               },
//               then: true,
//               else: false,
//             },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "chat",
//           foreignField: "_id",
//           as: "chat",
//           let: {
//             blocked: "$blockedMe",
//           },
//           pipeline: [
//             {
//               $project: {
//                 name: 1,
//                 avatar: {
//                   $cond: {
//                     if: "$$blocked",
//                     then: `${currDir}/defaultPeopleAvatar.png`,
//                     else: {
//                       $cond: {
//                         if: {
//                           $ne: ["$avatar", ""],
//                         },
//                         then: "$avatar",
//                         else: `${currDir}/defaultPeopleAvatar.png`,
//                       },
//                     },
//                   },
//                 },
//                 email: 1,
//                 verified: 1,
//                 active: {
//                   $cond: {
//                     if: "$$blocked",
//                     then: false,
//                     else: "$active",
//                   },
//                 },
//                 lastActive: 1,
//                 chatType: "user",
//               },
//             },
//           ],
//         },
//       },
//       {
//         $unwind: {
//           path: "$chat",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           blocked: 1,
//           mute: {
//             $cond: {
//               if: {
//                 $ne: ["$mute", []],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           chat: {
//             $ifNull: [
//               "$chat",
//               {
//                 _id: "$_id",
//                 name: "$name",
//                 avatar: {
//                   $ifNull: ["$avatar", `${currDir}/defaultPeopleAvatar.png`],
//                 },
//                 chatType: "group",
//                 protected: {
//                   $cond: {
//                     if: {
//                       $eq: ["$type", GROUP_TYPE.password_protected],
//                     },
//                     then: true,
//                     else: false,
//                   },
//                 },
//               },
//             ],
//           },
//           pin: {
//             $cond: {
//               if: "$pin",
//               then: true,
//               else: false,
//             },
//           },
//           pinAt: "$pin.updatedAt",
//           lastMessage: {
//             $cond: {
//               if: "$lastMessage",
//               then: {
//                 _id: "$lastMessage._id",
//                 deleted: "$lastMessage.deleted",
//                 user: { $first: "$user" },
//                 contentType: {
//                   $cond: {
//                     if: "$lastMessage.deleted",
//                     then: "deleted",
//                     else: "$lastMessage.contentType",
//                   },
//                 },
//                 text: {
//                   $cond: {
//                     if: "$lastMessage.deleted",
//                     then: "This message was deleted",
//                     else: "$lastMessage.text",
//                   },
//                 },
//                 contact: "$lastMessage.contact",
//                 createdAt: "$lastMessage.createdAt",
//                 message_status: {
//                   $cond: {
//                     if: "$lastMessage.deleted",
//                     then: MESSAGE_STATUS.deletedEveryone,
//                     else: {
//                       $cond: {
//                         if: {
//                           $or: [
//                             {
//                               $eq: ["$lastMessage.message_status", []],
//                             },
//                             {
//                               $ne: ["$lastMessage.sender", user],
//                             },
//                           ],
//                         },
//                         then: null,
//                         else: {
//                           $switch: {
//                             branches: [
//                               {
//                                 case: {
//                                   $allElementsTrue: {
//                                     $map: {
//                                       input: "$lastMessage.message_status",
//                                       in: {
//                                         $cond: {
//                                           if: {
//                                             $eq: [
//                                               MESSAGE_STATUS.seen,
//                                               "$$this.status",
//                                             ],
//                                           },
//                                           then: true,
//                                           else: false,
//                                         },
//                                       },
//                                     },
//                                   },
//                                 },
//                                 then: MESSAGE_STATUS.seen,
//                               },
//                               {
//                                 case: {
//                                   $allElementsTrue: {
//                                     $map: {
//                                       input: "$lastMessage.message_status",
//                                       in: {
//                                         $cond: {
//                                           if: {
//                                             $eq: [
//                                               MESSAGE_STATUS.received,
//                                               "$$this.status",
//                                             ],
//                                           },
//                                           then: true,
//                                           else: false,
//                                         },
//                                       },
//                                     },
//                                   },
//                                 },
//                                 then: MESSAGE_STATUS.received,
//                               },
//                               {
//                                 case: {
//                                   $allElementsTrue: {
//                                     $map: {
//                                       input: "$lastMessage.message_status",
//                                       in: {
//                                         $cond: {
//                                           if: {
//                                             $eq: [
//                                               MESSAGE_STATUS.sent,
//                                               "$$this.status",
//                                             ],
//                                           },
//                                           then: true,
//                                           else: false,
//                                         },
//                                       },
//                                     },
//                                   },
//                                 },
//                                 then: MESSAGE_STATUS.sent,
//                               },
//                             ],
//                             default: MESSAGE_STATUS.sent,
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//               else: null,
//             },
//           },
//           archive: 1,
//           unread: {
//             $cond: {
//               if: {
//                 $ne: ["$mark_unread", []],
//               },
//               then: -1,
//               else: {
//                 $size: {
//                   $filter: {
//                     input: "$messages",
//                     cond: {
//                       $and: [
//                         {
//                           $ne: [
//                             "$$this.contentType",
//                             CONTENT_TYPE.notification,
//                           ],
//                         },
//                         {
//                           $in: [user, "$$this.message_status.user"],
//                         },
//                         {
//                           $in: [
//                             MESSAGE_STATUS.received,
//                             "$$this.message_status.status",
//                           ],
//                         },
//                       ],
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     ];
//     const data = await friendModel.aggregate(aggregation);
//     if (data[0]) {
//       return {
//         success: true,
//         data: data[0],
//       };
//     }
//     return { success: false, message: "Not friend" };
//   } catch (error) {
//     console.log("error", error);
//     return { success: false, message: error.message };
//   }
// };

export const userProfile = async (user, friend) => {
  try {
    const aggregation = [
      {
        '$match': {
          'active': true,
          'receiverType': RECEIVER_TYPE.user,
          '_id': {
            '$ne': user._id
          }
        }
      }, {
        '$project': {
          '_id': 1
        }
      }, {
        '$lookup': {
          'from': 'chats',
          'localField': '_id',
          'foreignField': 'user',
          'as': 'friends',
          'pipeline': [
            {
              '$match': {
                'chat': user._id,
                'status': FRIENDSHIP_STATUS.accepted,
                'blockedMe': false
              }
            }
          ]
        }
      }, {
        '$unwind': {
          'path': '$friends',
          'preserveNullAndEmptyArrays': false
        }
      }, {
        '$replaceRoot': {
          'newRoot': '$friends'
        }
      }, {
        '$addFields': {
          'chat': user
        }
      }, {
        $project: { ...chatProject, user: 1 }
      }
    ];
    return await UserModel.aggregate(aggregation)
    // const aggregation = [
    //   {
    //     $match: {
    //       $or: [
    //         {
    //           sourceId: user._id,
    //           targetId: friend._id,
    //         },
    //         {
    //           sourceId: friend._id,
    //           targetId: user._id,
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $addFields: {
    //       friends: "$$ROOT",
    //       ...user,
    //       blockedMe: false,
    //     },
    //   },
    //   {
    //     $project: userProject(false),
    //   },
    // ];
    // const data = await friendModel.aggregate(aggregation);
    // return data[0];
  } catch (error) {
    console.log("error while user profile", error);
  }
};
