import { MEMBER_GROUP_ROLE, NOTIFICATION_ACTION, RECEIVER_TYPE, ROLE_CODE, STATUS_CODE, USER_STATUS } from "../../config/constant.js";
import { handleGroupUpdate } from "../../helpers/group.js";
import { updateChatInfo } from "../../models/chat.js";
import * as services from "../../models/group.js";
import * as validation from "../../validation/admin.js";
import fs from "fs"
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const modulesDir = path.join(__dirname, '../../apis/modules');

export const groups = async (req, res) => {
  try {
    const module = fs.existsSync(modulesDir + "/group")
    res.render("groups", { upgrade: !module });
  } catch (error) {
    console.log("error", error);
  }
};

export const groupAdd = async (req, res) => {
  try {
    return res.render("groupAdd", {});
  } catch (error) {
    console.log("error on add Group");
  }
};

export const groupAddPost = async (req, res, next) => {
  try {
    const { error } = validation.groupAddSchema(req.body);
    if (error) {
      console.log("Error", error);
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: true, message: error.message });
    }
    const response = await services.newGroup(req.body, req.user);
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const groupProfile = async (req, res) => {
  try {
    if (!req.query.id) {
      return res.render("groupProfile", { success: false, data: null });
    }
    const groupDetails = await services.getGroupDetails(req.query.id);
    return res.render("groupProfile", { groupDetails });
  } catch (error) {
    console.log("error while getting group profile");
  }
};

export const getGroupList = async (req, res) => {
  try {
    req.query.page = +req.query.page;
    req.query.limit = +req.query.limit;
    req.query.status = Boolean(req.query.status);
    const { error } = validation.getGroupList(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const page = req.query.page || 0;
    const limit = req.query.limit || 10;
    const skip = page * limit;
    const groupList = await services.groups({ skip, limit });
    if (groupList.success)
      return res.status(STATUS_CODE.success).json(groupList);
    return res.status(STATUS_CODE.bad_request).json(groupList);
  } catch (error) {
    console.log("error while getting group list", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error.." });
  }
};

export const groupEdit = async (req, res) => {
  try {
    if (!req.query.id) {
      return res.redirect("/group");
    }
    const groupDetails = await services.getGroupDetails(req.query.id);
    return res.render("groupEdit", { groupDetails });
  } catch (error) {
    console.log("error while renderin group edit.");
  }
};

export const groupUserList = async (req, res) => {
  try {
    const { error } = validation.groupUserList(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const groupUserList = await services.groupUserList(req.query);
    if (groupUserList.success)
      return res.status(STATUS_CODE.success).json(groupUserList);
    return res.status(STATUS_CODE.bad_request).json(groupUserList);
  } catch (error) {
    console.log("Error while getting group user list", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error.." });
  }
};

export const updateGroupUserStatus = async (req, res, next) => {
  try {
    const { error } = validation.updateGroupUserStatus(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const status = +req.body.status
    const response = await updateChatInfo(
      {
        chat: req.body.id,
        user: req.body.user,
        receiverType: RECEIVER_TYPE.group,
        role: MEMBER_GROUP_ROLE.member
      },
      { status: status }
    );
    if (response) {
      handleGroupUpdate({
        id: response.chat,
        action: status == USER_STATUS.active ? NOTIFICATION_ACTION.added : NOTIFICATION_ACTION.removed,
        user: req.user,
        members: [response.user],
      })
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json({ message: "error while updating member status" });
  } catch (error) {
    next(error);
  }
};

export const groupEditPost = async (req, res, next) => {
  try {
    const { error } = validation.groupEditSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateGroupDetails(
      { _id: req.body.id },
      req.body
    );
    if (response.success) {
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Group details updated successfully" });
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const searchGroup = async (req, res) => {
  try {
    const { error } = validation.searchSchema(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    req.query.status = !!+req.query.status;
    const limit = +req.query.limit;
    const skip = +req.query.page * limit;
    const response = await services.groups({ search: req.query.value, skip, limit });
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error>>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error occured" });
  }
};

export const searchGroupUser = async (req, res) => {
  try {
    const { error } = validation.searchSchema(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.groupUserList(req.query);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error>>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error occured" });
  }
};

export const addGroupUser = async (req, res, next) => {
  try {
    const { error } = validation.addGroupUser(req.body);
    const { group, users } = req.body;
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    await services.groupUserAdd({
      user: req.user,
      users,
      group,
      role: ROLE_CODE.public,
    });
    // const promises = [];
    // for (let user of users) {
    //   const data = {
    //     group: group,
    //     user: user,
    //     role: ROLE_CODE.public,
    //   };
    //   promises.push();
    // }
    // await Promise.all(promises);
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Users added successfully." });
  } catch (error) {
    console.log("Error while add group user", error);
    next(error);
  }
};

export const getUserGroups = async (req, res) => {
  try {
    if (!req.query.user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required user id. " });
    }
    const response = await services.groups({
      user: req.query.user,
    });
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error >>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unkownn Error" });
  }
};

export const getAddUserGroup = async (req, res) => {
  try {
    if (!req.query.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required user id." });
    }
    const response = await services.getAddUserGroup(req.query.id);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error >", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error" });
  }
};

export const addUserGroup = async (req, res, next) => {
  try {
    const { error } = validation.addUserGroup(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { groups, user } = req.body;
    // const promises = [];
    for (let group of groups) {
      await services.groupUserAdd({
        user: req.user,
        users: [user],
        group,
        role: ROLE_CODE.public,
      });
      // promises.push(
      //   (async () => {
      //     await services.groupUserAdd({
      //       group: group,
      //       user: user,
      //     });
      //   })()
      // );
    }
    // await Promise.all(promises);
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Added Successfully." });
  } catch (error) {
    console.log("error >", error);
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const { error } = validation.deleteGroup(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.success)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateGroupDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Group Deleted Successfully" });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error >>", error);
    next(error);
  }
};
