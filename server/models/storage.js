import Storage from "../utils/storage.js";
import storageModel from "./schema/storage.js";

export const configStorage = async (data) => {
  try {
    const config = await storageModel.create(data);
    if (config) {
      return { success: true, message: "Storage configured successfully." };
    }
    return { success: false, message: "unable to config storage" };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const storageConfig = async () => {
  try {
    const aggregation = [
      {
        $match: {
          status: true,
        },
      },
      {
        $sort: {
          default: -1,
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "_id",
          foreignField: "serviceId",
          pipeline: [
            {
              $match: {
                status: true,
              },
            },
          ],
          as: "files",
        },
      },
      {
        $addFields: {
          storageUsed: {
            $sum: "$files.size",
          },
          files: {
            $size: "$files",
          },
        },
      },
    ];
    const data = await storageModel.aggregate(aggregation);
    return { success: true, data };
  } catch (error) {
    console.log("ERROR here >>", error);
    return { success: false, message: error };
  }
};

export const getStorageServiceConfig = async (query) => {
  try {
    const data = await storageModel.findOne(query);
    if (data) {
      return { success: true, data };
    }
    return { success: false, message: "No Content found." };
  } catch (error) {
    return { success: false, message: "Error while getting Storage Details" };
  }
};

export const updateStorageSetting = async (query, update) => {
  try {
    const data = await storageModel.findOneAndUpdate(query, update, {
      new: true,
    });

    if (data) {
      const response = await Storage.config();
      if (response.success)
        return { success: true, message: "Updated Successfully" };
      else return { response };
    }
    return { success: false, message: "Content not found" };
  } catch (error) {
    return { success: false, message: "Error while updating Storage Details" };
  }
};

export const setDefaultStorage = async (id) => {
  try {
    const defaultStorage = await storageModel.findOne({ default: true });
    const setDefault = await storageModel.findOne({
      _id: id,
      enabled: true,
      status: true,
    });
    if (!setDefault) {
      return { success: false, message: "update to set default" };
    }
    setDefault.default = true;
    const response = await Storage.config({ success: true, data: setDefault });
    if (response.success) {
      if (defaultStorage) {
        defaultStorage.default = false;
        await defaultStorage.save();
      }
      await setDefault.save();
      return { success: true, message: "Storage is Set as default." };
    }
    await Storage.config();
    return response;
  } catch (error) {
    console.log("Error HEREERE>>>", error);
    return {
      success: false,
      message: "Error while set default storage service.",
    };
  }
};
