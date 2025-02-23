import { GENERAL_SETTING_KEY, STATUS_CODE } from "../../config/constant.js";
import { getGeneralSetting } from "../../models/generalSetting.js";
import { roles } from "../../models/role.js";
import * as services from "../../models/user.js";
import * as validation from "../../validation/admin.js";
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const modulesDir = path.join(__dirname, '../../apis/modules');

export const user = async (req, res) => {
  try {
    res.render("user", {});
  } catch (error) {
    console.log("error", error);
  }
};

export const getUserList = async (req, res) => {
  try {
    const response = await services.getUserList(req);
    if (response.success) {
      return res.status(200).json(response);
    }
    return res.status(400).json(response);
  } catch (error) {
    console.log("Error get user list", error);
    return res.status(500).json({ success: false, message: "Unknown Error.." });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { error } = validation.updateUserStatusSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateUserDetails(
      { _id: req.body.id },
      { status: req.body.status }
    );
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error.." });
  }
};

export const addUser = async (req, res) => {
  try {
    res.render("addUser", {});
  } catch (error) {
    console.log("error while adding user", error);
  }
};

export const addUserPost = async (req, res, next) => {
  try {
    const { error } = validation.addUserSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const user = await services.userDetail({
      $or: [{ email: req.body.email }, { uid: req.body.uid }],
      status: true,
    });
    if (user.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "User with email already exists." });
    const response = await services.addNewUser(req.body);
    if (response.success) {
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, messsage: "user added successfully" });
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error while adding new user", error);
    next(error);
  }
};

export const profile = async (req, res) => {
  try {
    const id = req.query.id || req.user._id;
    const user = await services.userDetail({ _id: id });
    const module = fs.existsSync(modulesDir + "/group")
    const groupConfg = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
    const group = groupConfg?.data?.group?.enabled || !module
    res.render("profile", { data: user.data, groupEnabled: group });
  } catch (error) {
    console.log("profile error", error);
  }
};

export const profileEdit = async (req, res) => {
  try {
    if (req.query.id) {
      const user = await services.userInfo({ _id: req.query.id });
      const rolesDetails = await roles({});
      res.render("profileEdit", {
        data: { ...user.data.toJSON(), rolesAvaliable: rolesDetails.data },
      });
    }
  } catch (error) {
    console.log("profile error", error);
  }
};

export const profileEditPost = async (req, res, next) => {
  try {
    const { error } = validation.updateUserDetails(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateUserDetails(
      { _id: req.body.id },
      req.body
    );
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error >>>", error);
    next(error);
  }
};

export const searchUser = async (req, res) => {
  try {
    const { error } = validation.searchSchema(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.findUser(req.query);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error>>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error occured" });
  }
};

export const getAddgroupUser = async (req, res) => {
  try {
    if (!req.query.group) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required group id." });
    }
    const response = await services.getAddGroupUser(req.query.group);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error occured" });
  }
};

export const getAddUserFriend = async (req, res) => {
  try {
    if (!req.query.user)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required User id" });
    const response = await services.getAddUserFriend(req.query);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error occured" });
  }
};

export const report = async (req, res, next) => {
  try {
    res.render("report", {});
  } catch (error) {
    console.log("error", error);
  }
};

export const reportList = async (req, res, next) => {
  const page = req.query.page || 0;
  const limit = req.query.limit || 10;
  const type = req.query.type;
  const skip = page * limit;
  try {
    const response = await services.getReportList({
      limit,
      skip,
      reportType: type,
    });
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, data: response.data });

    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: response.message });
  } catch (error) {
    next(error);
  }
};

export const getUid = async (req, res, next) => {
  const uid = req.params.uid;
  try {
    if (isNaN(uid))
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Send Valid UID" });

    let response = await services.usersDetail(
      {
        uid: uid,
      },
      {
        active: 0,
        devicetokens: 0,
        lastActive: 0,
        metadata: 0,
        aboutOptions: 0,
        about: 0,
      }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .send({ success: false, message: response.message });

    return res
      .status(STATUS_CODE.success)
      .send({ success: true, data: response.data });
  } catch (error) {
    next(error);
  }
};
