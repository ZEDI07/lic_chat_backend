import { FILE_TYPE } from "../config/constant.js";
import fileManagerModel from "./schema/fileManager.js";
import Storage from "../utils/storage.js";

export const addFile = async (data) => {
  try {
    return { success: true, data: await fileManagerModel.create(data) };
  } catch (error) {
    console.log("error while adding file.", error);
    return { success: false, message: "error while adding file" };
  }
};

export const getFiles = async ({
  page,
  limit,
  key,
  value,
  type,
  selectedDate,
}) => {
  try {
    const match = {
      status: true,
      fileType: FILE_TYPE.file,
    };
    if (key && value) {
      match[key] = { $regex: value, $options: "i" };
    }
    if (type) {
      match["mimetype"] = { $regex: type, $options: "i" };
    }
    if (selectedDate) {
      match["createdAt"] = selectedDate;
    }
    const skip = page * limit;
    const aggregation = [
      { $match: match },
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
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          files: [
            {
              $skip: +skip,
            },
            {
              $limit: +limit,
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $addFields: {
                url: {
                  $concat: ["$service.credentials.cdn_url", "$url"],
                },
              },
            },
          ],
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
    const response = await fileManagerModel.aggregate(aggregation);
    return {
      success: true,
      data: { files: response[0].files, count: response[0].count },
    };
  } catch (error) {
    console.log("error >>", error);
    return { success: false, message: error };
  }
};

export const updateFileStatus = async (query, update) => {
  try {
    const data = await fileManagerModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (data) return { success: true, data };
    return { success: false, message: "unable to update." };
  } catch (error) {
    return { success: false, message: "Error while updating data" };
  }
};

export const getfileDeatils = async (query) => {
  try {
    const data = await fileManagerModel.findOne(query);
    if (data) {
      return { success: true, data: data };
    }
    return { success: false, message: "data not found." };
  } catch (error) {
    return { success: false, message: "Error while updating data" };
  }
};

export const getfiles = async (query) => {
  try {
    const data = await fileManagerModel.find(query);
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: "Error while updating data" };
  }
};

export const deleteFile = async (media) => {
  try {
    const fileDetials = await fileManagerModel.findOneAndUpdate(
      { _id: media, status: true },
      { status: false },
      { new: true }
    );
    if (fileDetials)
      await Storage.deleteFile(fileDetials).then((response) => {
        if (!response.success) {
          fileDetials.status = true;
          fileDetials.save().then(() => console.log("updated file status")).catch(() => console.log("error while updating file status"));
        } else {
          console.log("file delete.")
        }
      }).catch((error) => console.log("error while deleting file", error));
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const fileTypes = async () => {
  const data = await fileManagerModel.aggregate([
    {
      $match: {
        fileType: "file",
        status: true,
      },
    },
    {
      $group: {
        _id: "$mimetype",
      },
    },
  ]);
  const types = [];
  data.forEach((element) => {
    types.push(element._id.split("/")[1]);
  });
  return types;
};
