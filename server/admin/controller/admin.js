import bcrypt from "bcrypt";
import { GENERAL_SETTING_KEY, MESSAGING_SETTING, STATUS_CODE, STORAGE_TYPE, STORAGE_TYPE_NAME } from "../../config/constant.js";
import { SERVER_URL } from "../../config/index.js";
import * as services from "../../models/admin.js";
import { updateGeneralSetting } from "../../models/generalSetting.js";
import { addLanguage } from "../../models/language.js";
import { configStorage, getStorageServiceConfig } from "../../models/storage.js";
import Storage from "../../utils/storage.js";
import * as validation from "../../validation/admin.js";

export const setup = async (req, res) => {
  try {
    const { error } = validation.setup(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    await updateGeneralSetting({ key: GENERAL_SETTING_KEY.domain }, { domain: req.body.domain });
    await updateGeneralSetting({ key: GENERAL_SETTING_KEY.agora }, { enabled: false });
    await updateGeneralSetting({ key: GENERAL_SETTING_KEY.setup_complete }, { password: await bcrypt.hash(req.body.password, 10) });
    const stroageConfig = await getStorageServiceConfig({ default: true })
    if (!stroageConfig.success) {
      await configStorage({
        storage: STORAGE_TYPE.local_storage,
        name: STORAGE_TYPE_NAME.local_storage,
        credentials: { cdn_url: `${SERVER_URL}/` },
        enabled: true,
        default: true,
        status: true
      });
    }
    await Storage.config()
    await updateGeneralSetting({ key: GENERAL_SETTING_KEY.messaging_setting }, { [GENERAL_SETTING_KEY.messaging_setting]: MESSAGING_SETTING.friends });
    await addLanguage({ name: "english", key: "en", default: true, status: true })
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "setup successfully" });
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown Error" });
  }
};

export const login = (req, res) => {
  try {
    res.render("login", { message: null });
  } catch (error) {
    console.log("error", error);
  }
};

export const loginPost = async (req, res) => {
  try {
    const { error } = validation.loginSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    } else {
      const response = await services.login(req);
      if (response.success) {
        return res
          .status(STATUS_CODE.success)
          .json({ success: true, message: "Login Successfull.", token:response.token });
      }
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ success: false, message: "Login Failed" });
    }
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown Error" });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    res.render("forgetPassword", { data: null });
  } catch (error) {
    console.log("error", error);
  }
};

export const forgetPasswordPost = async (req, res, next) => {
  try {
    const { error } = validation.forgetPasswordSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.forgetPassword(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error", error);
    next(error);
  }
};

export const me = async (req, res) => {
  try {
    const response = await services.adminDetails(req.session.user._id);
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error>>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error.." });
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.log("Error >>", error);
  }
};
