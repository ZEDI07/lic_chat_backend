import mongoose from "mongoose";
import { userProject, userchatModelProject } from "./pipe/user.js";
import CallModel from "./schema/call.js";
import { GENERAL_SETTING_KEY, RECEIVER_TYPE } from "../config/constant.js";
import { getGeneralSetting } from "./generalSetting.js";

export const newCall = async (data) => {
  try {
    const addedNew = await CallModel.create(data);
    if (!addedNew)
      return { success: false, messaage: "unablet to initiate call" };
    return { success: true, data: addedNew };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: error.message };
  }
};

export const updateCallInfo = async (query, update, project = {}) => {
  try {
    const data = await CallModel.findOneAndUpdate(query, update, { new: true, projection: project });
    if (data) return { success: true, data };
    return { success: false, message: "unable to update call Info" };
  } catch (error) {
    return { success: false, message: error.messaage };
  }
};

export const updateCalls = async (query, update) => await CallModel.updateMany(query, update)

export const callInfo = async (query) => {
  try {
    const data = await CallModel.findOne(query);
    if (data) return { success: true, data };
    return { success: false, message: "Call info not found" };
  } catch (error) {
    return { success: false, message: error.messaage };
  }
};

export const callsStatus = async (query) => await CallModel.find(query);

export const userCallLogs = async ({ user, limit, lastCall, channel, search }) => {
  const groupConfig = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
  const group = groupConfig?.group?.enabled || false;
  try {
    const aggregation = [
      {
        $match: {
          user: new mongoose.Types.ObjectId(user),
          deleted: false,
          ...lastCall ? { _id: { $lt: new mongoose.Types.ObjectId(lastCall) } } : {},
          ...channel ? { channel: new mongoose.Types.ObjectId(channel) } : {},
          ...!group ? { receiverType: { $ne: RECEIVER_TYPE.group } } : {}
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "chat",
          foreignField: "_id",
          as: "chat",
          pipeline: [
            ...search ? [{
              $match: {
                name: {
                  $regex: search,
                  $options: "i",
                }
              }
            }] : [],
            {
              $project: {
                ...userProject(),
                chatType: "$receiverType",
                enableCalling: {
                  $cond: {
                    if: {
                      $and: [{ $eq: ["$receiverType", RECEIVER_TYPE.group] }, { $eq: ["$settings.member.call", false] }]
                    },
                    then: false,
                    else: true
                  }
                }
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: "$chat",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: {
          _id: -1
        }
      },
      ...limit ? [{ $limit: limit }] : [],
      {
        $lookup: {
          from: "chats",
          localField: "chat._id",
          foreignField: "chat",
          as: "friends",
          pipeline: [
            {
              $match: {
                user: user,
              }
            }, {
              $project: {
                lastMessage: 0,
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: "$friends",
          preserveNullAndEmptyArrays: false,
        }
      },
      {
        $addFields: userchatModelProject
      },
      {
        $lookup: {
          from: "messages",
          localField: "channel",
          foreignField: "_id",
          as: "callDetails"
        }
      },
      {
        $unwind: {
          path: "$callDetails",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          friends: 0,
        }
      }
      // {
      //   $lookup: {
      //     from: "call_deletedes",
      //     foreignField: "call",
      //     localField: "_id",
      //     pipeline: [
      //       {
      //         $match: {
      //           user: user,
      //         },
      //       },
      //     ],
      //     as: "deleted",
      //   },
      // },
      // {
      //   $match: {
      //     deleted: {
      //       $eq: [],
      //     },
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "call_statuses",
      //     localField: "_id",
      //     foreignField: "call",
      //     pipeline: [{ $match: { user: user } }],
      //     as: "callStatus",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$callStatus",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $addFields: {
      //     user: {
      //       $cond: {
      //         if: {
      //           $eq: ["$caller", new mongoose.Types.ObjectId(user)],
      //         },
      //         then: "$receiver",
      //         else: "$caller",
      //       },
      //     },
      //     direction: {
      //       $cond: {
      //         if: {
      //           $eq: ["$callStatus.status", CALL_STATUS.initiated],
      //         },
      //         then: {
      //           $cond: {
      //             if: { $eq: ["$caller", user] },
      //             then: "Outgoing",
      //             else: "Incoming",
      //           },
      //         },
      //         else: {
      //           $cond: {
      //             if: { $eq: ["$callStatus.status", CALL_STATUS.accepted] },
      //             then: "Inccmming",
      //             else: {
      //               $cond: {
      //                 if: { $eq: ["$callStatus.status", CALL_STATUS.rejected] },
      //                 then: "Missed",
      //                 else: {
      //                   $cond: {
      //                     if: { $eq: ["$callStatus.status", CALL_STATUS.busy] },
      //                     then: "Outgoing",
      //                     else: null,
      //                   },
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "users",
      //     localField: "user",
      //     foreignField: "_id",
      //     pipeline: [
      //       {
      //         $project: userProject(),
      //       },
      //     ],
      //     as: "user",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$user",
      //     preserveNullAndEmptyArrays: false,
      //   },
      // },
    ];
    return await CallModel.aggregate(aggregation);
  } catch (error) {
    console.log("error in user call logs", error)
    return
  }
};

export const newGroupUserCall = async (data) => {
  try {
    const addedNew = [] // await groupCallModel.create(data);
    if (!addedNew)
      return { success: false, message: "unable to initiate call" };
    return { success: true, data: addedNew };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateGroupCallInfo = async (filter, update) => {
  try {
    const data = [] // await groupCallModel.findOneAndUpdate(filter, update, {
    // new: true,
    // });
    if (data) return { success: true, data };
    return { success: false, message: "unable to update group info" };
  } catch (error) {
    return { success: false, message: error.messaage };
  }
};

export const deleteCall = async ({ calls, user }) => {
  try {
    const update = [];
    for (let call of calls) {
      update.push({
        updateOne: {
          filter: {
            call: call,
            user: user,
          },
          update: {},
          upsert: true,
        },
      });
    }
    const response = true //await callDeletedSchema.bulkWrite(update);
    if (response) {
      return { success: true, message: "Deleted call" };
    }
    return { success: false, message: "unable to delete call" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const countCalls = async (filter) => await CallModel.countDocuments(filter)
