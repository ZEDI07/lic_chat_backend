import {
  FRIENDSHIP_STATUS,
  GENERAL_SETTING_KEY,
  ROLE_CODE,
  STATUS_CODE,
  USER_STATUS,
} from "../../config/constant.js";
import { chatBulkWrite } from "../../models/chat.js";
import { addUserFriend } from "../../models/friend.js";
import { getGeneralSetting } from "../../models/generalSetting.js";
import * as services from "../../models/user.js";
import * as validation from "../../validation/user.js";
import { friendSchema } from "../../validation/x-api/user.js";

export const addUser = async (req, res, next) => {
  try {
    const { error } = validation.registrationSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const user = await services.userDetail({ $or: [{ uid: req.body.uid }, { email: req.body.email }] });
    if (user.success)
      return res
      .status(STATUS_CODE.already_exists)
      .json({ message: "User with UID or EmailId already exists." , status : STATUS_CODE.already_exists });
    const data = {
      ...req.body,
      role: req.body.level_id,
    };
    if (req.body.level_id == ROLE_CODE.superadmin) {
      const defaultPassword = await getGeneralSetting({ key: GENERAL_SETTING_KEY.setup_complete });
      if (defaultPassword.success && defaultPassword.data.password)
        data.password = defaultPassword.data.password
    }
    const response = await services.addNewUser(data);
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  } 
};

export const updateDetails = async (req, res, next) => {
  try {
    const { error } = validation.updateDetails(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateUserDetails(
      { uid: req.params.uid, status: true },
      { ...req.body, role: req.body.level_id }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: response.message });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const uid = req.params.uid;
    const response = await services.updateUserDetails(
      { uid },
      { status: USER_STATUS.deleted }
    );
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const addFriend = async (req, res, next) => {
  try {
    const { error } = friendSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const userInfo = await services.userDetail({
      uid: req.params.uid,
      status: USER_STATUS.active,
    });
    if (!userInfo.success)
      return res.status(STATUS_CODE.success).json({ message: user.message });
    const addFriendUsers = await services.usersDetail(
      {
        uid: { $in: req.body.friends },
        status: USER_STATUS.active,
      },
    );

    if (!addFriendUsers.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: addFriendUsers.message });
    const response = await addUserFriend({
      user: userInfo.data._id,
      users: addFriendUsers.data.map((user) => user._id),
    });
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "friends added successfully" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const deleteFriend = async (req, res, next) => {
  try {
    const { error } = friendSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const user = await services.userDetail({
      uid: req.params.uid,
      status: true,
    });
    if (!user.success)
      return res.status(STATUS_CODE.success).json({ message: user.message });
    const removeFriendUsers = await services.usersDetail(
      {
        uid: { $in: req.body.friends },
        status: true,
      },
      "_id"
    );
    if (!removeFriendUsers.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: removeFriendUsers.message });
    const writeOps = [];
    for (let removeUser of removeFriendUsers.data) {
      writeOps.push({
        updateOne: {
          filter: { chat: user.data._id, user: removeUser._id },
          update: {
            status: FRIENDSHIP_STATUS.unfriend,
          },
        },
      }, {
        updateOne: {
          filter: { chat: removeUser._id, user: user.data._id },
          update: {
            status: FRIENDSHIP_STATUS.unfriend,
          },
        },
      });
    }
    const response = await chatBulkWrite(writeOps);
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "users removed from friend" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};
