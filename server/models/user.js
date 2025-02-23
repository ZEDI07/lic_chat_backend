import mongoose from "mongoose";
import { CONTENT_TYPE, DEFAULT_ABOUT, FRIENDSHIP_STATUS, MESSAGING_SETTING, ONLINE_PRIVACY, PRIVACY_STATUS, RECEIVER_TYPE, ROLE_CODE, USER_STATUS, defaultPeopleImg } from "../config/constant.js";
import { getMessagingSetting } from "./generalSetting.js";
import { mediaFilePipeline } from "./pipe/message.js";
import { chatProject, userModelProject, userProject } from "./pipe/user.js";
import report from "./schema/report.js";
import roleModel from "./schema/role.js";
import UserModel from "./schema/user.js";

export const getUserList = async (req) => {
  try {
    if (!req) {
      const user = await UserModel.find({ receiverType: RECEIVER_TYPE.user, status: USER_STATUS.active });
      return { success: true, data: { user, count: user.length } };
    }
    const page = req.query.page || 0;
    const limit = req.query.limit || 10;
    const status = req.query.status;
    const skip = page * limit;
    const match = {
      receiverType: RECEIVER_TYPE.user,
      status: +status,
    }
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "roleId",
          as: "roles",
        },
      },
      {
        $addFields: {
          roleName: "$roles.name",
        },
      },
      {
        $project: {
          roles: 0,
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $skip: +skip,
      },
      {
        $limit: +limit,
      },
    ];
    const user = await UserModel.aggregate(aggregation);
    const count = await UserModel.countDocuments(match);

    return { success: true, data: { user, count } };
  } catch (error) {
    console.log("Error in getting user list", error);
    return { success: false, message: error.message };
  }
};

export const userDetail = async (filter) => {
  try {
    let user = await UserModel.findOne(filter);
    if (!user) return { success: false, message: "user not found" };
    if (!user?.role)
      return { success: false, message: "Please add role to user" };
    let role = await roleModel.findOne({ roleId: user.role, status: true });
    if (user && role) {
      user = user.toJSON();
      role = role.toJSON();
      user["permissions"] = role.permissions;
      return { success: true, data: user };
    }
    return { success: false, message: "user not found" };
  } catch (error) {
    console.log(error);
    return { success: false, message: error.message };
  }
};

export const userInfo = async (filter, projection) => {
  try {
    const user = await UserModel.findOne(filter, projection);
    if (user) return { success: true, data: user };
    return { success: false, message: "user not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const usersDetail = async (filter, projection) => {
  try {
    const data = await UserModel.find(filter, projection);
    if (data.length) return { success: true, data };
    return { success: false, message: "No users found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateUserDetails = async (filter, update) => {
  try {
    const user = await UserModel.findOneAndUpdate(filter, update, {
      new: true,
    });
    if (user)
      return { success: true, message: "Updated Successfully", data: user };
    return { success: false, message: "User not found." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const addNewUser = async (body) => {
  try {
    body.avatar ??= defaultPeopleImg;
    body.lastActive ??= Date.now()
    body.role ??= ROLE_CODE.default;
    body.about ??= DEFAULT_ABOUT[0];
    body.aboutOptions ??= DEFAULT_ABOUT;
    body.active ??= false;
    body.verified ??= false;
    body.notification ??= {
      conversationTone: true,
      message: {
        showNotification: true,
        reactionNotification: true,
      },
      group: {
        showNotification: true,
        reactionNotification: true,
      },
      showPreview: true,
    }
    body.privacy ??= {
      lastSeen: PRIVACY_STATUS.everyone,
      online: ONLINE_PRIVACY.sameAs,
      profilePhoto: PRIVACY_STATUS.everyone,
      about: PRIVACY_STATUS.everyone,
      group: PRIVACY_STATUS.everyone,
      story: PRIVACY_STATUS.friends,
      call: PRIVACY_STATUS.everyone,
      readRecipts: true,
    }
    const data = await UserModel.create({ ...body, receiverType: RECEIVER_TYPE.user });
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const findUser = async (query) => {
  try {
    const search = {
      [query.key]: { $regex: query.value, $options: "i" },
      status: query.status,
    };
    const user = await UserModel
      .find(search)
      .skip(query.page * query.limit)
      .limit(query.limit);
    const count = await UserModel.countDocuments(search);
    return { success: true, data: { user, count } };
  } catch (error) {
    console.log("error in find user", error);
    return { success: false, message: "Error while creating user" };
  }
};

/**
 * Get list of user that added to group.
 * @param {*} group
 * @returns list of user.
 */
export const getAddGroupUser = async (group) => {
  try {
    const aggregation = [
      {
        $match: {
          status: USER_STATUS.active,
        },
      },
      {
        $project: userProject(),
      },
      {
        $lookup: {
          from: "group_users",
          localField: "_id",
          foreignField: "user",
          pipeline: [
            {
              $match: {
                group: new mongoose.Types.ObjectId(group),
                status: USER_STATUS.active,
              },
            },
          ],
          as: "users",
        },
      },
      {
        $match: {
          users: {
            $eq: [],
          },
        },
      },
      {
        $project: {
          users: 0,
        },
      },
    ];
    const response = await UserModel.aggregate(aggregation);
    return { success: true, data: response };
  } catch (error) {
    console.log("error in find user", error);
    return { success: false, message: "Error while creating user" };
  }
};

/**
 * Get list of user that is not user friend.
 * @param {*} param0
 * @returns list of user.
 */
export const getAddUserFriend = async ({ user }) => {
  try {
    const aggregation = [
      {
        $match: {
          _id: {
            $ne: new mongoose.Types.ObjectId(user),
          },
          status: 1,
        },
      },
      {
        $lookup: {
          from: "friends",
          localField: "_id",
          foreignField: "sourceId",
          pipeline: [
            {
              $match: {
                targetId: new mongoose.Types.ObjectId(user),
                status: FRIENDSHIP_STATUS.accepted,
              },
            },
          ],
          as: "source",
        },
      },
      {
        $lookup: {
          from: "friends",
          localField: "_id",
          foreignField: "targetId",
          pipeline: [
            {
              $match: {
                sourceId: new mongoose.Types.ObjectId(user),
                status: FRIENDSHIP_STATUS.accepted,
              },
            },
          ],
          as: "target",
        },
      },
      {
        $match: {
          source: {
            $eq: [],
          },
          target: {
            $eq: [],
          },
        },
      },
    ];
    const response = await UserModel.aggregate(aggregation);
    return { success: true, data: response };
  } catch (error) {
    console.log("error in find user", error);
    return { success: false, message: "Error while getAddUserFriend" };
  }
};

export const getUserPermission = async (user) => {
  try {
    const aggregation = [
      {
        $match: {
          _id: user,
        },
      },
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "roleId",
          as: "permission",
        },
      },
      {
        $unwind: {
          path: "$permission",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          permission: "$permission.permissions",
        },
      },
    ];
    const senderPermission = await UserModel.aggregate(aggregation);
    return { success: true, data: senderPermission[0] };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateUsers = async (filter, update) => {
  try {
    await UserModel.updateMany(filter, update);
    return { success: true, message: "updated" };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const getProfileInfo = async (user, friend) => {
  try {
    let data = await UserModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(friend),
          status: 1,
        },
      },
      {
        $project: userProject(false),
      },
      {
        $lookup: {
          from: "friends",
          let: { source: user, target: new mongoose.Types.ObjectId(friend) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sourceId", "$$source"] },
                    { $eq: ["$targetId", "$$target"] },
                    { $eq: ["$status", FRIENDSHIP_STATUS.accepted] },
                    {
                      $in: [
                        new mongoose.Types.ObjectId(friend),
                        "$messageblock",
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "block",
        },
      },
      {
        $addFields: {
          block: { $gt: [{ $size: "$block" }, 0] },
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "receiver",
          pipeline: [
            {
              $match: {
                sender: new mongoose.Types.ObjectId(user),
                $or: [
                  { contentType: CONTENT_TYPE.image },
                  { contentType: CONTENT_TYPE.video },
                  { contentType: CONTENT_TYPE.audio },
                  { contentType: "media" },
                  { link: { $ne: null } },
                  // { condentType: "doc" },
                  // { condentType: "link" },
                  // { condentType: "links" },
                  { contentType: "application" },
                ],
              },
            },
          ],
          as: "media",
        },
      },
      {
        $addFields: {
          mediaCount: { $size: "$media" },
        },
      },
      {
        $lookup: {
          from: "message_starreds",
          let: { users: user },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$users"] },
                    { $eq: ["$status", true] },
                  ],
                },
              },
            },
          ],
          as: "st",
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "st.message",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                $or: [
                  {
                    $and: [
                      { sender: user },
                      { receiver: new mongoose.Types.ObjectId(friend) },
                    ],
                  },
                  {
                    $and: [
                      { sender: new mongoose.Types.ObjectId(friend) },
                      { receiver: user },
                    ],
                  },
                ],
              },
            },
          ],
          as: "stared",
        },
      },
      {
        $addFields: {
          staredCount: { $size: "$stared" },
        },
      },
      {
        $lookup: {
          from: "chat_mutes",
          let: { chatId: "$_id", userId: new mongoose.Types.ObjectId(user) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chat", "$$chatId"] },
                    { $eq: ["$user", "$$userId"] },
                  ],
                },
                status: true,
              },
            },
          ],
          as: "mute",
        },
      },

      {
        $lookup: {
          from: "group_users",
          let: { user: "$_id", friend: new mongoose.Types.ObjectId(friend) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$user"] },
                    { $eq: ["$user", "$$friend"] },
                  ],
                },
                status: USER_STATUS.active,
              },
            },
            {
              $project: {
                group: 1,
              },
            },
          ],
          as: "commonGroups",
        },
      },
      {
        $addFields: {
          commonGroupCount: { $size: "$commonGroups" },
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "commonGroups.group",
          foreignField: "_id",

          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                avatar: 1,
                status: 1,
                type: 1,
              },
            },
            {
              $lookup: {
                from: "group_users",
                foreignField: "group",
                localField: "_id",
                pipeline: [
                  { $match: { status: USER_STATUS.active } },
                  { $limit: 4 },
                ],
                as: "groupUsersId",
              },
            },
            {
              $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "groupUsersId.user",
                pipeline: [
                  { $match: { status: USER_STATUS.active } },
                  { $project: { name: 1 } },
                ],
                as: "members",
              },
            },
            {
              $project: {
                groupUsersId: 0,
              },
            },
          ],
          as: "groupProfiles",
        },
      },
      {
        $project: {
          media: 0,
          st: 0,
          stared: 0,
          commonGroups: 0,
        },
      },
    ]);
    if (data && data.length > 0)
      return { success: true, data: data, message: "Successfully" };
    return { success: false, message: "somthing went wrong " };
  } catch (error) {
    console.log(error, "error");
    return { success: false, message: "Error " };
  }
};

export const getReportList = async ({ limit, skip, reportType }) => {
  const match = reportType > 0 ? [{ $match: { reportType: +reportType } }] : [];
  try {
    const query = [
      ...match,
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [
            {
              $project: { ...userProject(false) },
            },
          ],
          as: "users",
        },
      },
      {
        $unwind: {
          path: "$users",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "report",
          foreignField: "_id",
          pipeline: [
            {
              $project: { ...userProject(false) },
            },
          ],
          as: "userReport",
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "report",
          foreignField: "_id",
          as: "groupReport",
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "report",
          foreignField: "_id",
          pipeline: [...mediaFilePipeline],
          as: "messageReport",
        },
      },
      {
        $addFields: {
          report: {
            $cond: {
              if: { $gt: [{ $size: "$userReport" }, 0] },
              then: "$userReport",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$groupReport" }, 0] },
                  then: "$groupReport",
                  else: "$messageReport",
                },
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: "$report",
        },
      },
      {
        $project: {
          userReport: 0,
          messageReport: 0,
          groupReport: 0,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      { $sort: { _id: -1 } },
    ];
    const response = await report.aggregate(query);
    if (response) return { success: true, data: response };
    return { success: false, message: "somthing went wrong" };
  } catch (error) {
    console.log(error);
    return { success: false, message: error.message };
  }
};

export const users = async ({
  user,
  search,
  createGroup = false,
  addGroup,
}) => {
  try {
    const messaging_setting = await getMessagingSetting();
    user = new mongoose.Types.ObjectId(user);
    const aggregation = [
      {
        $match: {
          status: 1,
          receiverType: RECEIVER_TYPE.user,
          _id: {
            $ne: user,
          },
          ...(search ? { name: { $regex: search, $options: "i" } } : {}),
        },
      },
      {
        $lookup: {
          from: "chats",
          as: "friends",
          localField: "_id",
          foreignField: "chat",
          pipeline: [
            {
              $match: {
                user: user,
                receiverType: RECEIVER_TYPE.user,
                status: FRIENDSHIP_STATUS.accepted
              }
            }
          ],
        },
      },
      ...(search &&
        (messaging_setting == MESSAGING_SETTING.everyone || createGroup)
        ? []
        : [
          {
            $match: {
              friends: {
                $ne: [],
              },
            },
          },
        ]),
      {
        $unwind: {
          path: "$friends",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "friends.blocked": { $ne: true },
        },
      },
      ...(addGroup
        ? [
          {
            $lookup: {
              from: "chats",
              localField: "_id",
              foreignField: "user",
              as: "member",
              pipeline: [
                {
                  $match: {
                    chat: addGroup,
                    receiverType: RECEIVER_TYPE.group,
                    status: USER_STATUS.active,
                  },
                },
              ],
            },
          },
          {
            $match: {
              member: { $eq: [] },
            },
          },
        ]
        : []),
      {
        $project: {
          ...userModelProject,
          friends: {
            $cond: {
              if: "$friends",
              then: true,
              else: false
            }
          },
          createGroup: {
            $cond: {
              if: {
                $or: [
                  {
                    $eq: ["$friends.blockedMe", true],
                  },
                  {
                    $eq: ["$privacy.group", PRIVACY_STATUS.nobody],
                  },
                  {
                    $and: [
                      {
                        $eq: ["$privacy.group", PRIVACY_STATUS.friends],
                      },
                      { $ne: ["$friends.status", FRIENDSHIP_STATUS.accepted] },
                    ],
                  },
                ],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      ...(createGroup ? [{ $match: { createGroup: true } }] : []),
    ];
    const data = await UserModel.aggregate(aggregation);
    // const data = await friendModel.aggregate(aggregation);
    return { success: true, data: data };
  } catch (error) {
    console.log(error);
    return { success: false, message: error.message };
  }
};

export const chatProfilePrivacy = async (user) => {
  try {
    const aggregation = [
      {
        '$match': {
          'active': true,
          'receiverType': 'user',
          '_id': {
            '$ne': user._id
          }
        }
      }, {
        '$project': {
          '_id': 1,
          'name': 1
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
                'status': 1
              }
            }
          ]
        }
      }, {
        '$lookup': {
          'from': 'chats',
          'localField': '_id',
          'foreignField': 'user',
          'as': 'groups',
          'pipeline': [
            {
              '$match': {
                'receiverType': 'group',
                'status': 1
              }
            }
          ]
        }
      }, {
        '$unwind': {
          'path': '$friends',
          'preserveNullAndEmptyArrays': true
        }
      }, {
        '$replaceRoot': {
          'newRoot': {
            '$mergeObjects': [
              {
                '$ifNull': [
                  '$friends', {
                    'user': '$_id',
                    'blockedMe': false,
                    'status': 0
                  }
                ]
              }, {
                'groups': '$groups.chat',
                'friends': {
                  '$cond': {
                    'if': '$friends',
                    'then': true,
                    'else': false
                  }
                }
              }
            ]
          }
        }
      }, {
        '$addFields': {
          'chat': user
        }
      }, {
        '$project': {
          ...chatProject,
          'user': 1,
          'groups': 1,
          "friends": 1
        }
      }
    ]
    return await UserModel.aggregate(aggregation)
  }
  catch (error) {
    console.log("error while handling privacy update", error);
  }
}