import { GENERAL_SETTING_KEY, STATUS_CODE } from "../../config/constant.js";
import { getGeneralSetting, updateGeneralSetting } from "../../models/generalSetting.js";
import Storage from "../../utils/storage.js";
import { generalSettingSchema, getGeneralSettingSchema, pushNotificationSchema } from "../../validation/admin.js";
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const modulesDir = path.join(__dirname, '../../apis/modules');

export const generalChatSetting = (req, res) => res.render("generalChatSetting");

export const generalSetting = async (req, res, next) => {
  try {
    const { error } = getGeneralSettingSchema(req.query);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const data = await getGeneralSetting({ key: req.query.key });
    if (data.success) {
      if (req.query.key == GENERAL_SETTING_KEY.group) {
        data.data = data.data.toJSON();
        data.data.upgrade = !fs.existsSync(modulesDir + "/group")
      }
      return res.status(STATUS_CODE.success).json(data)
    };
    return res.status(STATUS_CODE.bad_request).json({ message: data.message });
  } catch (error) {
    next(error);
  }
};

export const thirdParty = async (req, res, next) =>
  res.render("thirdParty");

export const updateGeneralSettings = async (req, res, next) => {
  try {
    const { error } = generalSettingSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const key = Object.keys(req.body)[0];
    switch (key) {
      case "quality": {
        const response = await updateGeneralSetting(
          { key: GENERAL_SETTING_KEY.image_setting },
          req.body
        );
        if (response.success) {
          Storage.compressConfig(response.data.quality);
          return res
            .status(STATUS_CODE.success)
            .json({ message: "updated successfuly", data: response.data });
        }
        break;
      }
      case GENERAL_SETTING_KEY.messaging_setting:
      case GENERAL_SETTING_KEY.domain:
      case GENERAL_SETTING_KEY.auto_delete_attachment:
      case GENERAL_SETTING_KEY.group:
      case GENERAL_SETTING_KEY.agora: {
        if (key == GENERAL_SETTING_KEY.agora) {
          const isEnbled = await getGeneralSetting({ key: GENERAL_SETTING_KEY.agora, enabled: true })
          if (!isEnbled.success)
            return res.status(STATUS_CODE.bad_request).json({
              success: false,
              message: 'cannot update agora appid'
            })
        }
        const response = await updateGeneralSetting(
          {
            key: GENERAL_SETTING_KEY[key],
          },
          req.body
        );
        if (response.success) {
          return res
            .status(STATUS_CODE.success)
            .json({ message: "updated successfully", data: response.data });
        }
        break;
      }
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "Error while updating data" });
  } catch (error) {
    next(error);
  }
};

export const pushNotificationSetting = async (req, res, next) => {
  try {
    const { error } = pushNotificationSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await updateGeneralSetting(
      { key: GENERAL_SETTING_KEY.one_signal },
      req.body
    );
    if (response.success) {
      return res.status(STATUS_CODE.success).json({ message: "Data updated." });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "Error while updating data" });
  } catch (error) {
    next(error);
  }
};
