import mongoose from "mongoose";
import { mediaFilePipeline } from "./pipe/message.js";
import { userProject } from "./pipe/user.js";
import messageStarredModel from "./schema/messageStarred.js";
import userModel from "./schema/user.js";

export const settings = async (filter, projection) => {
  try {
    const data = await userModel.findOne(filter, projection);
    if (data) return { success: true, data };
    return { success: false, message: "Settings not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const starredMessages = async (user) => {
  try {
    user = new mongoose.Types.ObjectId(user);
    const aggregation = [
      {
        $match: {
          user: user,
          status: true,
        },
      },
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
                from: "message_statuses",
                localField: "_id",
                foreignField: "message",
                as: "message_statuses",
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
                message_statuses: {
                  $eq: [],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "sender",
                pipeline: [
                  {
                    $project: userProject(false),
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
                path: "$receiver",
                preserveNullAndEmptyArrays: false,
              },
            },
            ...mediaFilePipeline,
            {
              $lookup: {
                from: "messages",
                localField: "reply",
                foreignField: "_id",
                as: "reply",
                pipeline: mediaFilePipeline,
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
                as: "forward",
                pipeline: mediaFilePipeline,
              },
            },
            {
              $unwind: {
                path: "$forward",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$message",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          message: 1,
          createdAt: 1,
        },
      },
    ];
    const data = await messageStarredModel.aggregate(aggregation);
    if (data) return { success: true, data };
    return { success: false, message: "Starred messages not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
