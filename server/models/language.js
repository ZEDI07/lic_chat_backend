import languageModel from "./schema/language.js";

export const getLanguage = async (query) => {
  try {
    const language = await languageModel.findOne(query);
    if (language) {
      return { success: true, data: language };
    }
    return { success: false, message: "No Data Found." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const addLanguage = async (data) => {
  try {
    const newData = await languageModel.create(data);
    if (newData) {
      return { success: true, data: newData };
    }
    return { success: false, message: "unable to insert language." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const allLanguages = async () => {
  try {
    const data = await languageModel
      .find({ status: true })
      .sort({ default: -1 });
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const setDefaultStorage = async (id) => {
  try {
    const defaultStorage = await languageModel.findOne({ default: true });
    const setDefault = await languageModel.findOneAndUpdate(
      {
        _id: id,
        status: true,
        default: false,
      },
      { default: true },
      { new: true }
    );
    if (!setDefault) {
      return { success: false, message: "unable to set default" };
    }
    if (defaultStorage) {
      defaultStorage.default = false;
      await defaultStorage.save();
    }
    return { success: true, message: "Storage is Set as default." };
  } catch (error) {
    return {
      success: false,
      message: "Error while set default storage service.",
    };
  }
};

export const updateLanguage = async (query, update) => {
  try {
    const data = await languageModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (data) {
      return { success: true, data };
    }
    return { success: false, message: "language not found." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
