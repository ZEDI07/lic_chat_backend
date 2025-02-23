import mongoose from "mongoose";
import reactionModel from "./schema/reaction.js";

export const addReaction = async (data) => {
  try {
    const dataAdded = await reactionModel.create(data);
    return { success: true, data: dataAdded };
  } catch (error) {
    return { success: false, message: "error while adding reaction." };
  }
};

export const getReactions = async ({ id } = {}, projection) => {
  try {
    const match = {
      status: true,
    };
    id && (match._id = new mongoose.Types.ObjectId(id));
    const aggregation = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "files",
          localField: "media",
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
                      enabled: true,
                      status: true,
                    },
                  },
                ],
                as: "serviceDetail",
              },
            },
            {
              $unwind: {
                path: "$serviceDetail",
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          as: "reactionDetail",
        },
      },
      {
        $unwind: {
          path: "$reactionDetail",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          url: {
            $concat: [
              "$reactionDetail.serviceDetail.credentials.cdn_url",
              "$reactionDetail.url",
            ],
          },
        },
      },
      {
        $project: projection || {
          reactionDetail: 0,
        },
      },
    ];
    const data = await reactionModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: "error while getting reactions." };
  }
};

export const updateReactionDetails = async (query, update) => {
  try {
    const data = await reactionModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: false, messsage: "unable to update reaction" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const reactionInfo = async (query) => {
  try {
    const data = await reactionModel.findOne(query);
    if (data) return { success: true, data };
    return { success: false, message: "Reaction not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
