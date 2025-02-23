import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { FRIENDSHIP_STATUS, GROUP_TYPE, MEMBER_GROUP_ROLE, MESSAGING_SETTING, NOTIFICATION_ACTION, RECEIVER_TYPE, USER_STATUS, defaultGroupImg } from "../config/constant.js";
import { handleGroupUpdate } from "../helpers/group.js";
import { chatBulkWrite } from "./chat.js";
import { getMessagingSetting } from "./generalSetting.js";
import { userProject } from "./pipe/user.js";
import ChatModel from "./schema/chat.js";
import UserModel from "./schema/user.js";

export const groupActiveMembersWithUserInfo = async ({ group }) => {
  group = new mongoose.Types.ObjectId(group);
  const aggregation = [
    {
      $match: {
        chat: group,
        receiverType: RECEIVER_TYPE.group,
        status: USER_STATUS.active,
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $match: {
              status: USER_STATUS.active,
              receiverType: RECEIVER_TYPE.user
            }
          }
        ]
      }
    }, {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: false
      }
    }
  ];
  return await ChatModel.aggregate(aggregation)
}

/**
 * function to create group.
 * @param {*} data
 * @param {*} adminId
 * @returns group details.
 */
export const newGroup = async (data, admin) => {
  try {
    data.about = data.metadata;
    data.receiverType = RECEIVER_TYPE.group
    data.avatar ??= defaultGroupImg;
    data.type ??= GROUP_TYPE.public;
    data.settings ??= {
      member: {
        editDetails: false,
        sendMessage: true,
        addMember: false,
        call: true
      },
      admin: {
        approveMember: false,
      },
    };
    data.link = uuidv4();
    const group = await UserModel.create(data);
    await groupUserAdd({
      users: [admin._id],
      group: group._id,
      role: MEMBER_GROUP_ROLE.superAdmin,
      user: admin,
      action: NOTIFICATION_ACTION.newGroup,
    });
    return {
      success: true,
      message: "Group created successfully",
      data: group,
    };
  } catch (error) {
    console.log("Error >>>", error);
    return { success: false, message: "error while creating group" };
  }
};

/**
 * Function to add user to group.
 * @param {*} users
 * @param {*} group
 * @param {*} role
 * @returns return success with message.
 */
export const groupUserAdd = async ({
  users,
  group,
  role = MEMBER_GROUP_ROLE.member,
  user,
  action,
}) => {
  try {
    const update = [];
    for (let user of users) {
      update.push({
        updateOne: {
          filter: {
            chat: group,
            user: user,
          },
          update: {
            $set: {
              role: role,
              status: USER_STATUS.active,
              // createdAt: {
              //   $ifNull: ["$createdAt", "$$NOW"],
              // },
            },
            $setOnInsert: {
              receiverType: RECEIVER_TYPE.group,
              mute: false,
              archive: false,
              unread: 0,
              markUnread: false,
            }
          },
          upsert: true,
        },
      });
    }
    const response = await chatBulkWrite(update);
    if (response) {
      handleGroupUpdate({
        user,
        id: group,
        members: users,
        action: action || NOTIFICATION_ACTION.added,
      });
      return { success: true, message: "user added in group" };
    }
    return { success: false, message: "user added already in group" };
  } catch (error) {
    console.log(error, "in group  adding users");
    return { success: false, message: "error while adding user to group" };
  }
};

/**
 * Function to Get all Groups.
 * @param {*} query
 * @returns group data with count.
 */
export const groups = async ({ search, user, skip, limit, }) => {
  try {
    const match = {
      status: USER_STATUS.active,
      receiverType: RECEIVER_TYPE.group
    };
    if (search) {
      match["name"] = { $regex: search, $options: "i" };
    }
    const pagination = skip && limit ? [{
      $skip: skip,
    },
    {
      $limit: limit,
    }] : [];

    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "chat",
          pipeline: [
            {
              $match: {
                receiverType: RECEIVER_TYPE.group,
                ...user ? { user: new mongoose.Types.ObjectId(user) } : {},
                status: {
                  $in: [USER_STATUS.active, USER_STATUS.inactive],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [
                  {
                    $match: {
                      status: USER_STATUS.active,
                    },
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
            },
          ],
          as: "members",
        },
      },
      ...user ? [{ $match: { members: { $ne: [] } } }] : [],
      {
        $addFields: {
          users: user ? { $first: "$members" } : "$members",
          members: {
            $size: "$members",
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $facet: {
          groups: pagination,
          count: [
            {
              $count: "count",
            },
          ],
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
    return { success: true, data: { groups: data[0]?.groups || [], count: data[0]?.count || 0 } };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: "error while getting groups details" };
  }
};

/**
 * Function to get group details with their active members only.
 * @param {*} id
 * @returns group details with Number of member exists.
 */
export const getGroupDetails = async (id, selfOut = false, user) => {
  const removeSelf = selfOut
    ? { user: { $ne: new mongoose.Types.ObjectId(user) } }
    : {};
  try {
    const aggregation = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          status: USER_STATUS.active,
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "chat",
          pipeline: [
            {
              $match: {
                status: USER_STATUS.active,
                receiverType: RECEIVER_TYPE.group,
                ...removeSelf,
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
                    $match: {
                      status: USER_STATUS.active,
                    },
                  },
                  {
                    $project: userProject(),
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
            // {
            //   $lookup: {
            //     from: "roles",
            //     localField: "user.role",
            //     foreignField: "roleId",
            //     as: "roles",
            //   },
            // },
            // {
            //   $unwind: {
            //     path: "$roles",
            //     preserveNullAndEmptyArrays: false,
            //   },
            // },
            // {
            //   $addFields: {
            //     "user.permissions": "$roles.permissions",
            //   },
            // },
          ],
          as: "members",
        },
      },
      {
        $addFields: {
          totalMembers: {
            $size: "$members",
          },
        },
      },
    ];
    const groups = await UserModel.aggregate(aggregation);
    if (groups.length) return { success: true, data: groups[0] };
    return { success: false, message: "Group unavailable" };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: "error while getting groups details" };
  }
};

/**
 * Function to get group details with their users or group details with group id.
 * @param {group, page, limit, status} query
 * @returns group detials with their total numbers.
 */
export const groupUserList = async (query) => {
  try {
    const group = query.group;
    const page = +query.page || 0;
    const limit = +query.limit || 10;
    const status = +query.status;
    const skip = page * limit;
    const user = new mongoose.Types.ObjectId(query.user);
    const friendsLookup = [];
    const messaging_setting = await getMessagingSetting();
    if (messaging_setting == MESSAGING_SETTING.everyone) {
      friendsLookup.push({
        $addFields: {
          showOption: true,
        },
      });
    } else {
      friendsLookup.push({
        $lookup: {
          from: "chats",
          localField: "user._id",
          foreignField: "user",
          as: "showOption",
          pipeline: [
            {
              $match: {
                chat: user,
                status: 1,
                receiverType: "user",
                blocked: false
              }
            }
          ]
        }
      },
        {
          $addFields: {
            showOption: {
              $cond: {
                if: { $eq: ["$showOption", []] },
                then: false,
                else: true
              }
            }
          }
        }
      );
    }
    const pagination = [];
    if (query.page && query.limit)
      pagination.push(
        {
          $skip: skip,
        },
        {
          $limit: limit,
        }
      );

    const userLookupPipeline = [];
    if (query.key && query.value) {
      userLookupPipeline.push({
        $match: {
          [query.key]: {
            $regex: query.value,
            $options: "i",
          },
          status: USER_STATUS.active,
        },
      });
    } else {
      userLookupPipeline.push({
        $match: {
          status: USER_STATUS.active,
        },
      });
    }
    userLookupPipeline.push({ $project: userProject() });
    const aggregation = [
      {
        $match: {
          chat: new mongoose.Types.ObjectId(group),
          status: status ?? USER_STATUS.active,
          receiverType: RECEIVER_TYPE.group,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [...userLookupPipeline],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          users: [...pagination, ...friendsLookup, {
            $project: {
              _id: 1,
              user: 1,
              role: 1,
              status: 1,
              showOption: 1,
              createdAt: 1
            }
          }],
          count: [
            {
              $count: "count",
            },
          ],
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
    const response = await ChatModel.aggregate(aggregation);
    return {
      success: true,
      data: { users: response[0].users, count: response[0].count },
    };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: "error while getting groups users" };
  }
};

/**
 * Function to update group user.
 * @param {*} filter
 * @param {*} update
 * @returns
 */
// export const updateGroupUserData = async (
//   filter,
//   update,
//   options = {
//     new: true,
//   }
// ) => {
//   try {
//     const response = await groupUserModel.findOneAndUpdate(
//       filter,
//       update,
//       options
//     );
//     if (response) return { success: true, message: "Updated Successfully" };
//     return { success: false, message: "Unable to update details" };
//   } catch (error) {
//     console.log("error while", error);
//     return { success: false, message: "error while getting groups users" };
//   }
// };

/**
 * function to update group details.
 * @param {*} filter
 * @param {*} update
 * @returns
 */
export const updateGroupDetails = async (filter, update, project) => {
  try {
    const response = await UserModel.findOneAndUpdate(filter, update, {
      new: true,
      projection: project,
    });
    if (response) return { success: true, data: response };
    return { success: false, message: "unable to update group details." };
  } catch (error) {
    console.log("error while updating group detials", error);
    return { success: false, message: "Error while updating group details." };
  }
};

/**
 * function to get groups list of user.
 * @param {*} user
 * @returns group list.
 */
// export const getUserGroups = async ({ user, search }) => {
//   try {
//     const groupFilterPipeline = [];
//     search
//       ? groupFilterPipeline.push({
//         $match: {
//           name: { $regex: search, $options: "i" },
//           status: USER_STATUS.active,
//         },
//       })
//       : groupFilterPipeline.push({
//         $match: {
//           status: USER_STATUS.active,
//         },
//       });
//     const aggregation = [
//       {
//         $match: {
//           user: new mongoose.Types.ObjectId(user),
//           status: {
//             $in: [USER_STATUS.active, USER_STATUS.inactive],
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "group",
//           foreignField: "_id",
//           pipeline: groupFilterPipeline,
//           as: "group",
//         },
//       },
//       {
//         $unwind: {
//           path: "$group",
//           preserveNullAndEmptyArrays: false,
//         },
//       },
//     ];
//     const response = await groupUserModel.aggregate(aggregation);
//     return {
//       success: true,
//       data: response,
//     };
//   } catch (error) {
//     console.log("error while getting user groups.", error);
//     return { success: false, message: "error while getting user groups." };
//   }
// };

/**
 * function to get list of group in which user not added.
 * @param {*} user
 * @returns
 */
export const getAddUserGroup = async (user) => {
  try {
    const aggregation = [
      {
        $match: {
          status: USER_STATUS.active,
          receiverType: RECEIVER_TYPE.group,
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "chat",
          pipeline: [
            {
              $match: {
                user: new mongoose.Types.ObjectId(user),
                status: USER_STATUS.active,
              },
            },
          ],
          as: "chats",
        },
      },
      {
        $match: {
          chats: {
            $eq: [],
          },
        },
      },
    ];
    const groups = await UserModel.aggregate(aggregation);
    return { success: true, data: groups };
  } catch (error) {
    console.log("error >>", error);
    return { success: false, message: "unable to get groups." };
  }
};

/**
 * get group info from group id.
 */
// export const groupInfo = async (filter, projection) => {
//   try {
//     const data = await groupModel.findOne(filter, projection);
//     if (data) return { success: true, data };
//     return { success: false, message: "Group Details not found." };
//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// };

/**
 * Group user with their permissons
 * @param {*} group
 * @returns
 */
// export const groupUserWithPermission = async (group) => {
//   try {
//     const aggregation = [
//       {
//         $match: {
//           group: new mongoose.Types.ObjectId(group),
//           status: USER_STATUS.active,
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "user",
//           foreignField: "_id",
//           as: "users",
//           pipeline: [
//             {
//               $match: {
//                 status: USER_STATUS.active,
//               },
//             },
//             {
//               $lookup: {
//                 from: "roles",
//                 localField: "role",
//                 foreignField: "roleId",
//                 as: "permissions",
//               },
//             },
//             {
//               $unwind: {
//                 path: "$permissions",
//                 preserveNullAndEmptyArrays: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $unwind: {
//           path: "$users",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           user: {
//             _id: "$user",
//             name: "$users.name",
//             avatar: "$users.avatar",
//             verified: "$users.verified",
//             active: "$users.active",
//             lastActive: "$uers.lastActive",
//           },
//           permissions: "$users.permissions.permissions",
//         },
//       },
//     ];
//     const data = await groupUserModel.aggregate(aggregation);
//     return { success: true, data };
//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// };

// export const groupuser = async (group, user) => {
//   try {
//     let group1 = new mongoose.Types.ObjectId(group);
//     let user1 = new mongoose.Types.ObjectId(user);
//     const aggregation = [
//       {
//         $match: {
//           user: user1,
//           group: group1,
//           status: USER_STATUS.active,
//         },
//       },
//       {
//         $lookup: {
//           from: "groups",
//           localField: "group",
//           foreignField: "_id",
//           as: "group",
//           pipeline: [
//             {
//               $match: {
//                 status: true,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $unwind: {
//           path: "$group",
//           preserveNullAndEmptyArrays: false,
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           public: {
//             $cond: {
//               if: {
//                 $in: ["$role", Object.values(MEMBER_GROUP_ROLE)],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           moderator: {
//             $cond: {
//               if: {
//                 $in: [
//                   "$role",
//                   [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin],
//                 ],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           admin: {
//             $cond: {
//               if: {
//                 $eq: ["$role", MEMBER_GROUP_ROLE.admin],
//               },
//               then: true,
//               else: false,
//             },
//           },
//         },
//       },
//     ];
//     const data = await groupUserModel.aggregate(aggregation);
//     console.log(data, user, group, "data");
//     if (data && data.length > 0) return { success: true, data: data[0] };
//     return { success: false, message: "User not found" };
//   } catch (error) {
//     return { success: false, message: error.message };
//   }
// };

// export const groupUserInfo = async (query) => {
//   try {
//     const data = await groupUserModel.findOne(query);
//     if (data) return { success: true, data };
//     return { success: false, message: "user info not found." };
//   } catch (error) {
//     return { success: false, messsage: error };
//   }
// };

export const getProfile = async (group, user) => {
  try {
    group = new mongoose.Types.ObjectId(group);
    user = new mongoose.Types.ObjectId(user);
    const messaging_setting = await getMessagingSetting();
    const showOptionPipeline = messaging_setting == MESSAGING_SETTING.everyone ? [{
      $addFields: {
        showOption: true
      }
    }] : [{
      $lookup: {
        from: "chats",
        localField: "user",
        foreignField: "user",
        as: "friends",
        pipeline: [
          {
            $match: {
              chat: user
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: "$friends",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        showOption: {
          $cond: {
            if: {
              $eq: ["$friends.status", FRIENDSHIP_STATUS.accepted]
            },
            then: true,
            else: false
          }
        }
      }
    },];
    const aggregation = [
      {
        $match: {
          _id: group,
          status: USER_STATUS.active,
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "chat",
          pipeline: [
            ...showOptionPipeline,
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: userProject()
                  }
                ]
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $project: {
                friends: 0,
                lastMessage: 0
              }
            }
          ],
          as: "members",
        },
      },
    ];
    const groups = await UserModel.aggregate(aggregation);
    if (groups.length) return { success: true, data: groups[0] };
    return { success: false, message: "Data not found." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "server error" };
  }
};

// export const validGroup = async (condition) => {
//   try {
//     let res = await groupModel.findOne(condition);
//     if (res) {
//       return { success: true, data: res };
//     } else {
//       return { success: false, message: "group not exist" };
//     }
//   } catch (error) {
//     return {
//       success: false,
//       message: "somthing went wrong while finding group",
//     };
//   }
// };

// export const getGroupPass = async ({ group }) => {
//   try {
//     let res = await groupModel.findOne({ _id: group, status: 0 });
//     if (res) {
//       return { success: true, message: "group exist" };
//     } else {
//       return { success: false, message: "group not exist" };
//     }
//   } catch (error) {
//     return {
//       success: false,
//       message: "somthing went wrong while finding group",
//     };
//   }
// };

// export const isMember = async (filter) => {
//   try {
//     const res = await groupUserModel.findOne(filter);
//     if (!res)
//       return {
//         success: false,
//         message: "you dont have rights to see pending requirest",
//       };
//     return { success: true, message: "you are admin you have rights" };
//   } catch (error) {
//     return { success: false, message: error };
//   }
// };

export const getpendingMembers = async ({ group, user }) => {
  try {
    const query = [
      {
        $match: {
          chat: new mongoose.Types.ObjectId(group),
          status: USER_STATUS.pending,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                status: USER_STATUS.active,
              },
            },
            {
              $project: userProject(),
            },
            // {
            //   $lookup: {
            //     from: "group_users",
            //     localField: "_id",
            //     foreignField: "user",
            //     pipeline: [
            //       {
            //         $match: {
            //           status: USER_STATUS.active,
            //         },
            //       },
            //     ],
            //     as: "commonGroups",
            //   },
            // },
            // {
            //   $lookup: {
            //     from: "group_users",
            //     localField: "commonGroups.group",
            //     foreignField: "group",
            //     pipeline: [
            //       {
            //         $match: {
            //           user: user,
            //           status: USER_STATUS.active,
            //         },
            //       },
            //     ],
            //     as: "commonGroups",
            //   },
            // },
            // {
            //   $addFields: {
            //     commonGroupCount: { $size: "$commonGroups" },
            //   },
            // },
            // {
            //   $project: {
            //     commonGroups: 0,
            //   },
            // },
          ],
          as: "user",
        },
      },
      // {
      //   $addFields: { pendingUsers: "$users" },
      // },
      // {
      //   $project: {
      //     pendingUsers: 1,
      //   },
      // },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];
    const data = await ChatModel.aggregate(query);
    return { success: true, data };
  } catch (error) {
    console.log(error, "res");
    return { success: false, message: error };
  }
};

// export const pendingReq = async (filter, update, options) => {
//   try {
//     const response = await groupUserModel.findOneAndUpdate(filter, update);

//     if (response) return { success: true, message: " Successfully" };
//     return { success: false, message: "member not found" };
//   } catch (error) {
//     console.log("error while", error);
//     return { success: false, message: "error while getting", error };
//   }
// };

// export const reqToJoinGroup = async (filter, update) => {
//   try {
//     const response = await groupUserModel.findOneAndUpdate(filter, update, {
//       upsert: true,
//     });

//     if (response) return { success: true, message: " Successfully" };
//     return { success: false, message: "member not found" };
//   } catch (error) {
//     console.log("error while", error);
//     return { success: false, message: "error while getting", error };
//   }
// };

// export const forgetGroupPassword = async (data) => {
//   try {
//     const otp = Math.floor(Math.random() * 9000 + 1000);
//     let saveOpt = await groupModel.findOneAndUpdate(
//       { _id: data.group._id },
//       { otp: otp }
//     );
//     if (!saveOpt) {
//       return { success: false, message: "Unable to generate OTP" };
//     }
//     const content = {
//       to: data.email,
//       subject: "Reset Group Password",
//       body: `Your OTP to change ${data.group.name} group password is ${otp}`,
//     };
//     const response = await sendMail(content);
//     if (response.success) {
//       return { success: true, message: "OTP sent successfully" };
//     } else {
//       return { success: false, message: "Error while sending OTP to mail." };
//     }
//   } catch (error) {
//     console.log("Error while admin login", error);
//     return { success: false, message: "Unkown Error.." };
//   }
// };

export const groupMembers = async (match) => {
  return await ChatModel.aggregate([
    {
      $match: match,
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        pipeline: [
          {
            $match: {
              status: USER_STATUS.active,
            },
          },
          {
            $project: userProject(),
          },
        ],
        as: "user",
      },
    },
    {
      $match: {
        user: { $ne: [] },
      },
    },
    {
      $replaceRoot: {
        newRoot: { $first: "$user" },
      },
    },
  ]);
};

