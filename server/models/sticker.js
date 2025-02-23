import mongoose from "mongoose";
import stickerModel from "./schema/sticker.js";
import stickerCategoryModel from "./schema/stickerCategory.js";
import stickerPackModel from "./schema/stickerPack.js";

export const addStickerCategory = async (data) => {
  try {
    const addedData = await stickerCategoryModel.create(data);
    if (addedData) return { success: true, data };
    return { success: false, message: "unable to add data." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getStickerCategory = async (id, search) => {
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
    const data = await stickerCategoryModel
      .aggregate(aggregation)
      ;
    return { success: true, data };
  } catch (error) {
    console.log("errror >", error);
    return { success: false, message: error.message };
  }
};

export const stickerCategoryUpdateDetails = async (query, update) => {
  try {
    const data = await stickerCategoryModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: false, message: "Details not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const addStickerPack = async (data) => {
  try {
    const dataCreated = await stickerPackModel.create(data);
    if (dataCreated) return { success: true, data: dataCreated };
    return { success: false, message: "Unable to add sticker pack." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getAllStickerPack = async (id, search) => {
  try {
    const match = {
      status: true,
    };
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
        $lookup: {
          from: "sticker_categories",
          localField: "category",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                status: true,
              },
            },
          ],
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
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
    return {
      success: true,
      data: await stickerPackModel.aggregate(aggregation),
    };
  } catch (error) {
    console.log(error);
    return { success: false, message: "error while getting sticker pack." };
  }
};

export const updateStickerPackDetails = async (query, update) => {
  try {
    const data = await stickerPackModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: false, message: "unable to update details" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const addSticker = async (data) => {
  try {
    const addedData = await stickerModel.create(data);
    return { success: true, data: addedData };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getStickers = async (
  { id, pack, category },
  { categoryDetails } = {},
  projection
) => {
  try {
    const match = { status: true };
    id && (match._id = new mongoose.Types.ObjectId(id));
    pack && (match.pack = new mongoose.Types.ObjectId(pack));
    category && (match.category = new mongoose.Types.ObjectId(category));
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
        $project: projection || {
          imageDetails: 0,
        },
      },
    ];
    categoryDetails &&
      aggregation.push({
        $lookup: {
          from: "sticker_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      });
    const data = await stickerModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateStickerDetails = async (query, update) => {
  try {
    const data = await stickerModel.findOneAndUpdate(query, update);
    if (data) return { success: true, data };
    return { success: false, message: "unable to update details." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const stickers = async (query) => {
  try {
    const data = await stickerModel.find(query);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const packs = async (query) => {
  try {
    const data = await stickerPackModel.find(query);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
