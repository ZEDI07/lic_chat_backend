import { FRIENDSHIP_STATUS, RECEIVER_TYPE, STATUS_CODE, USER_STATUS } from "../../config/constant.js";
import * as services from "../../models/friend.js";
import { userInfo, usersDetail } from "../../models/user.js";
import * as validation from "../../validation/admin.js";

export const addUserFriend = async (req, res, next) => {
  try {
    if (
      req.body.users &&
      typeof req.body.users == "string" &&
      (req.body.users = [req.body.users])
    );
    const { error } = validation.addUserFriends(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const checkSource = await userInfo({
      _id: req.body.user,
      receiverType: RECEIVER_TYPE.user,
      status: USER_STATUS.active,
    });
    if (!checkSource) return { success: false, message: "user not found." };
    let validatedUser = await usersDetail({ _id: { $in: req.body.users }, status: USER_STATUS.active, receiverType: RECEIVER_TYPE.user })
    if (!validatedUser.success)
      return res.status(STATUS_CODE.bad_request).json(validatedUser);
    validatedUser = validatedUser.data.map((user) => user._id);
    const response = await services.addUserFriend({ user: req.body.user, users: validatedUser, status: FRIENDSHIP_STATUS.active });
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error while adding user friends.", error);
    next(error);
  }
};

export const getUserFriends = async (req, res, next) => {
  try {
    if (!req.query.user)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required user id." });
    const response = await services.friendList(req.query);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error whiel getting user friends", error);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: "Unknown Error." });
  }
};

export const updateFriendshipStatus = async (req, res, next) => {
  try {
    const { error } = validation.updateFriendStatus(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    const response = await services.updateFriend(
      { $or: [{ chat: req.body.id, user: req.body.user }, { chat: req.body.user, user: req.body.id }] },
      { status: req.body.status }
    );
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error whiel getting user friends", error);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: "Unknown Error." });
  }
};
