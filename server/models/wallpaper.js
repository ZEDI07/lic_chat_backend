import mongoose from "mongoose";
import wallpaperModel from "./schema/wallpaper.js";
import wallpaperCategoryModel from "./schema/wallpaperCategory.js";
import { mediaForWallpaper } from "./pipe/wallpaper.js";
import chatWallpapers from "./schema/chatWallpaper.js";

export const addWallpaper = async (data) => {
  try {
    const addedData = await wallpaperModel.create(data);
    if (addedData) return { success: true, data };
    return { success: false, message: "unable to add wallpaper" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const backgrounds = async (id, categoryId) => {
  try {
    const match = {
      status: true,
    };
    id && (match._id = new mongoose.Types.ObjectId(id));
    categoryId && (match.category = new mongoose.Types.ObjectId(categoryId));
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
          as: "imageDetails",
        },
      },
      {
        $unwind: {
          path: "$imageDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          url: {
            $concat: [
              "$imageDetails.storages.credentials.cdn_url",
              "$imageDetails.url",
            ],
          },
        },
      },
      {
        $project: {
          imageDetails: 0,
        },
      },
    ];
    const data = await wallpaperModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateWallpaperDetails = async (query, update) => {
  try {
    const data = await wallpaperModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: false, message: "unable to update data." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const addWallpaperCategory = async (data) => {
  try {
    const addedData = await wallpaperCategoryModel.create(data);
    if (addedData) {
      return { success: true, data };
    }
    return { success: false, message: "unable to add wallpaper category" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getWallpaperCategory = async (id, search) => {
  try {
    const match = { status: true };
    id && (match._id = new mongoose.Types.ObjectId(id));
    if (search) {
      match[search.key] = { $regex: search.value, $options: "i" };
    }
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
          as: "imageDetails",
        },
      },
      {
        $unwind: {
          path: "$imageDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          url: {
            $concat: [
              "$imageDetails.storages.credentials.cdn_url",
              "$imageDetails.url",
            ],
          },
        },
      },
      {
        $project: {
          imageDetails: 0,
        },
      },
    ];
    const data = await wallpaperCategoryModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateWallpaperCategory = async (query, update) => {
  try {
    const data = await wallpaperCategoryModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: true, message: "Unable to update category" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const wallpaper = async (query) => {
  try {
    const data = await wallpaperModel.find(query);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const catagoriesAndThereWallpaper = async (id = null) => {
  id && (id = new mongoose.Types.ObjectId(id));

  try {
    const query = [
      {
        $match: {
          status: true,
          ...(id ? { _id: id } : {}),
        },
      },
      ...mediaForWallpaper,
      ...(id
        ? [
            {
              $lookup: {
                from: "wallpapers",
                localField: "_id",
                foreignField: "category",
                pipeline: [...mediaForWallpaper],
                as: "wallpapers",
              },
            },
          ]
        : []),
    ];

    const data = await wallpaperCategoryModel.aggregate(query);
    if (!data) return { success: false, data: "something went wrong" };
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getChatWallpaper = async ({ user, chat }) => {
  chat = new mongoose.Types.ObjectId(chat);

  try {
    const query = [
      {
        $match: {
          chat: chat,
          user: user,
        },
      },
      {
        $lookup: {
          from: "wallpapers",
          localField: "wallpaper",
          foreignField: "_id",
          pipeline: [...mediaForWallpaper],
          as: "wallpaper",
        },
      },
      {
        $unwind: {
          path: "$wallpaper",
        },
      },
      {
        $replaceRoot: { newRoot: "$wallpaper" },
      },
    ];

    const response = await chatWallpapers.aggregate(query);
    if (!response) return { success: false, message: "Something went wrong" };
    return { success: true, data: response };
  } catch (error) {
    console.log(error, "error");
    return { success: false, message: error.message };
  }
};
