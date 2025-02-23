import { GENERAL_SETTING_KEY, MESSAGING_SETTING } from "../config/constant.js";
import generalSettingModel from "./schema/generalSetting.js";

export const updateGeneralSetting = async (query, update) => {
  try {
    const data = await generalSettingModel.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
    });
    if (data) return { success: true, data };
    return { success: false, message: "Data not found" };
  } catch (error) {
    console.log("error while updating general setting", error);
    return { success: true, message: error.message };
  }
};

export const getGeneralSetting = async (query, projection) => {
  try {
    const data = await generalSettingModel.findOne(query, projection);
    if (data) return { success: true, data };
    return { success: false, message: "Data not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getMessagingSetting = async () => {
  let messaging_setting = MESSAGING_SETTING.friends;
  const response = await getGeneralSetting({
    key: GENERAL_SETTING_KEY.messaging_setting,
  });
  if (response.success) messaging_setting = response.data.messaging_setting;
  return messaging_setting;
};
