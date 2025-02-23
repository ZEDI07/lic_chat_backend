import bcrypt from "bcrypt";
import moment from "moment-timezone"
import mongoose from "mongoose"
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { CONTENT_TYPE, GENERAL_SETTING_KEY, GROUP_TYPE, MEMBER_GROUP_ROLE, NOTIFICATION_ACTION, RECEIVER_TYPE, STATUS_CODE, USER_STATUS } from "../../../config/constant.js";
import { handleGroupJoinRequest, handleGroupUpdate } from "../../../helpers/group.js";
import { chatInfo, findChats, updateChatInfo } from "../../../models/chat.js";
import { addFile } from "../../../models/filemanager.js";
import { getGeneralSetting } from "../../../models/generalSetting.js";
import * as groupService from "../../../models/group.js";
import { getProfile, getpendingMembers, groupMembers, groupUserAdd, groupUserList, newGroup, updateGroupDetails } from "../../../models/group.js";
import * as services from "../../../models/message.js";
import { userProject } from "../../../models/pipe/user.js";
import message from "../../../models/schema/message.js";
import { getStorageServiceConfig } from "../../../models/storage.js";
import { updateUserDetails, userInfo, users } from "../../../models/user.js";
import { generateOTP } from "../../../utils/common.js";
import { sendMail } from "../../../utils/mail.js";
import Storage from "../../../utils/storage.js";
import * as validation from "../../../validation/group.js";
import { changePassVerify, groupId, validateVerifyPass } from "../../../validation/group.js";

export const groups = async (req, res, next) => {
  try {
    const response = await groupService.groups({ user: req.user._id });
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

/**
 * To Get All Member while creating new group.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns List of user frined.
 */
export const createGroup = async (req, res, next) => {
  try {
    const response = await users(
      { user: req.user._id, search: req.query.search, createGroup: true },
      true
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });

    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

/**
 * To Create New Group .
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns with create message or failed message.
 */
export const createNewGroup = async (req, res, next) => {
  try {
    if (req.body.users && typeof req.body.users == "string")
      req.body.users = [req.body.users];
    const { error } = validation.createGroupPayload(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const body = { ...req.body, createdBy: req.user._id };

    if (req.file && CONTENT_TYPE.image !== req.file.mimetype.split("/")[0]) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Invalid image format" });
    } else if (req.file) {
      const savedData = await Storage.uploadFile(req.file);
      if (savedData.success) {
        const fileDetails = await addFile(savedData.data);
        if (!fileDetails.success) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: "Error with uploading file." });
        }
        const serviceDetails = await getStorageServiceConfig({
          _id: savedData.data.serviceId,
        });
        if (!serviceDetails.success) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: "Error with uploading file." });
        }
        body.avatar =
          serviceDetails.data.credentials.cdn_url + savedData.data.url;
      }
    }
    // hashing protect password
    req.body.type == GROUP_TYPE.password_protected &&
      req.body.password &&
      (body.password = await bcrypt.hash(req.body.password, 10));
    //creating new group..
    const response = await newGroup(body, req.user);
    if (response.success) {
      /// adding user to group
      await groupUserAdd({
        users: req.body.users,
        group: response.data.id,
        role: MEMBER_GROUP_ROLE.member,
        user: req.user,
      });
      return res.status(STATUS_CODE.success).json({
        success: true,
        message: "Group Created Successfully",
        data: response.data,
      });
      // const secretKey = SECRET_KEY;
      // const payload = {
      //   groupId: response.data._id,
      //   user: "group",
      // };
      // const token = Jwt.sign(payload, secretKey);
      // const baseUrl = `${SERVER_URL}/api/group/join/${token}`;
      // let setLink = await updateGroupDetails(
      //   { _id: response.data._id },
      //   { $set: { link: baseUrl } }
      // );

      // const buffer = await qrcode.toBuffer(setLink?.data?.link, {
      //   type: "png",
      //   color: {
      //     dark: "#000000", // QR code color
      //     light: "#ffffff", // Background color
      //   },
      // });

      // const form = new FormData();
      // form.append("file", buffer, {
      //   filename: "qr_code.png",
      //   contentType: "image/png",
      // });

      // const formHeaders = form.getHeaders();

      // const uploadLink = await axios.post(
      //   `${SERVER_URL}/api/uploadFile`,
      //   form,
      //   {
      //     headers: {
      //       ...formHeaders,
      //     },
      //   }
      // );
      // let check = {};
      // if (uploadLink) {
      //   let link = uploadLink.data.link;
      //   check = await updateGroupDetails(
      //     { _id: response.data._id },
      //     { $set: { qrcode: link } }
      //   );
      //   // let qrLink = check.data.qrcode;
      // }

      // === >  emmit  < === //
      // let messageData = {
      //   sender: req.user._id,
      //   receiver: response?.data?._id,
      //   receiverType: RECEIVER_TYPE.group,
      //   status: MESSAGE_STATUS.notify,
      //   contentType: CONTENT_TYPE.notification,
      //   action: NOTIFICATION_ACTION.newGroup,
      // };
      // const message = await services.createMessage(messageData);
      // console.log(message, "message ");
      // const receiver = await getGroupDetails(response?.data?._id);

      // if (receiver.success) {
      //   handleNewMessage({
      //     message: { ...message.data.toJSON(), req },
      //     receiver: receiver.data,
      //     sender: req.user,
      //   });
      // }
      // // === >  emmit  < === //

      // if (userAdded.success) {
      //   return res.status(STATUS_CODE.success).json(check.data);
      // }
      // if (check.success)
      //   return res.status(STATUS_CODE.success).json(check.data);
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "Error while creating group." });
  } catch (error) {
    next(error);
  }
};

// /**
//  * To Add New Member to group.
//  * @param {*} req
//  * @param {*} res
//  * @param {*} next
//  * @returns Return success or failed.
//  */
// export const uploadFile = async (req, res, next) => {
//   try {
//     if (req.file && CONTENT_TYPE.image !== req.file.mimetype.split("/")[0]) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Invalid image format" });
//     } else if (req.file) {
//       const savedData = await Storage.uploadFile(req.file);
//       if (savedData.success) {
//         const serviceDetails = await getStorageServiceConfig({
//           _id: savedData.data.serviceId,
//         });
//         if (!serviceDetails.success) {
//           return res
//             .status(STATUS_CODE.bad_request)
//             .json({ message: "Error with uploading file." });
//         }

//         res.status(STATUS_CODE.success).send({
//           success: true,
//           link: serviceDetails.data.credentials.cdn_url + savedData.data.url,
//         });
//       } else {
//         console.log("false success");
//         return res
//           .status(STATUS_CODE.bad_request)
//           .json({ message: "Error with uploading file." });
//       }
//     } else {
//       console.log("here it is");
//     }
//   } catch (error) {
//     console.log(error, "error in upload");
//     next(error);
//   }
// };

export const addUser = async (req, res, next) => {
  try {
    const { error } = validation.addUser(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const group = await userInfo({ _id: req.body.group, status: USER_STATUS.active });
    if (!group.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Group Not found" });
    const member = await chatInfo({ chat: req.body.group, user: req.user._id, status: USER_STATUS.active });
    if (!member) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Not a member of this group" });
    }
    if (member.role == MEMBER_GROUP_ROLE.member && !group.data.settings.member.addMember)
      return res.status(STATUS_CODE.bad_request).json({
        success: false,
        message: "Required permission to add user in this group",
      });
    const userAdded = await groupUserAdd({
      users: req.body.users,
      group: req.body.group,
      role: MEMBER_GROUP_ROLE.member,
      user: req.user,
    });
    if (userAdded.success)
      return res.status(STATUS_CODE.success).json({ success: true, userAdded });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, userAdded });
  } catch (error) {
    next(error);
  }
};

/**
 * To Get List of user to be add in group .
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns all user friend who is not added in group.
 */
export const getAddUser = async (req, res, next) => {
  try {
    const { group } = req.params;
    const { error } = validation.groupId({ group });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const groupDetails = await userInfo({ _id: group, status: USER_STATUS.active });
    if (!groupDetails.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "group details not found" });
    const memberDeatils = await chatInfo({
      user: req.user._id,
      chat: group,
      status: USER_STATUS.active,
    });
    if (!memberDeatils)
      return res.status(STATUS_CODE.bad_request).json({success: false, message: "Not a member of this group" });
    if (
      groupDetails.data.settings.member.addMember ||
      memberDeatils.role == MEMBER_GROUP_ROLE.admin ||
      memberDeatils.role == MEMBER_GROUP_ROLE.superAdmin
    ) {
      const newusers = await users({
        user: req.user._id,
        search: req.query.search,
        createGroup: true,
        addGroup: new mongoose.Types.ObjectId(group),
      });
      if (newusers.success)
        return res.status(STATUS_CODE.success).json(newusers.data);
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "unable to get new users" });
    } else
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "you can't add your to this group" });
  } catch (error) {
    next(error);
  }
};

/**
 * To Get group details .
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns group details with all Participants.
 */
// export const groupDetails = async (req, res, next) => {
//   try {
//     const response = await getGroupDetails(req.params.group);
//     if (response.success) {
//       if (
//         !response.data.members.some(
//           (member) => String(member.user._id) == String(req.user._id)
//         )
//       )
//         return res
//           .status(STATUS_CODE.bad_request)
//           .json({ message: "You are not a member of this group" });
//       // const ismodifier = response.data.members.some(
//       //   (member) =>
//       //     String(member.user._id) == String(req.user._id) &&
//       //     [ROLE_CODE.superadmin, ROLE_CODE.moderators].includes(member.role)
//       // );
//       // if (
//       //   (await checkPermission(req, "remove_members_from_group")) &&
//       //   ismodifier
//       // ) {
//       //   response.data.members = response.data.members.map((member) => {
//       //     if (member.role == ROLE_CODE.superadmin) return member;
//       //     else
//       //       return {
//       //         ...member,
//       //       };
//       //   });
//       // }
//       // const responseData = {
//       //   ...response.data,
//       // };
//       return res.status(STATUS_CODE.success).json(response.data);
//     }
//     return res
//       .status(STATUS_CODE.bad_request)
//       .json({ message: response.message });
//   } catch (error) {
//     next(error);
//   }
// };

// export const removeUserDialoge = async (req, res, next) => {
//   try {
//     const isMember = await groupuser(req.params.group, req.user._id);
//     if (!isMember.success) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: "Not a member of this group" });
//     }
//     if (!isMember.data.moderator)
//       return res.status(STATUS_CODE.bad_request).json({
//         success: false,
//         message: "Required permission to add user in this group",
//       });
//     const t = req.t;
//     return res.status(STATUS_CODE.success).json({
//       success: true,
//       dialog: {
//         title: t("Remove User"),
//         description: t("Are you sure remove this user?"),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Create"),
//             apiUrl: `/group/remove`,
//             apiMethod: "POST",
//             apiParams: {
//               group: req.params.group,
//               user: req.params.user,
//             },
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * To Remove user from group.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns success or failed.
 */
export const removeUser = async (req, res, next) => {
  try {
    const { error } = validation.removeUserPayload(req.body);
    console.log('error')
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { group, user } = req.body;
    const isAdminMember = await chatInfo({ chat: group, user: req.user._id, status: USER_STATUS.active, role: { $in: [MEMBER_GROUP_ROLE.superAdmin, MEMBER_GROUP_ROLE.admin] } });
    if (!isAdminMember) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Not a member of this group" });
    }
    const response = await updateChatInfo(
      {
        chat: group,
        user: user,
      },
      { status: USER_STATUS.inactive }
    );
    if (response) {
      // const userDetails = await userDetail({ _id: user });
      // if (userDetails) {
      handleGroupUpdate({
        id: group,
        action: NOTIFICATION_ACTION.removed,
        user: req.user,
        members: [user],
      });
      // socketGroupNotify({
      //   user: req.user,
      //   group,
      //   receiverType: RECEIVER_TYPE.group,
      //   status: MESSAGE_STATUS.notify,
      //   contentType: CONTENT_TYPE.notification,
      //   updateTo: [`user_${user}`],
      //   action: NOTIFICATION_ACTION.removed,
      //   actionOn: user,
      //   groupUpdates: { group: group, youAreMember: false },
      //   req: req,
      // });
      // }
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "user removed successfully" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: response.message });
  } catch (error) {
    next(error);
  }
};

// export const editGroupDialog = async (req, res, next) => {
//   try {
//     const group = req.params.group;
//     const response = await groupInfo({ _id: req.params.group, status: true });
//     if (!response.success) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: response.message });
//     }
//     const isMember = await groupuser(group, req.user._id);
//     if (!isMember.success) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Not a member of this group" });
//     }
//     if (!isMember.data.public)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Required permission to add user in this group" });
//     const t = req.t;
//     const responseData = {
//       navigationTitle: t("Edit Group"),
//       done: {
//         label: t("Done"),
//         apiUrl: "/group/edit",
//         apiMethod: "POST",
//         apiParams: {
//           group: group,
//           about: "",
//           avatar: "",
//         },
//       },
//       edit: t("Edit"),
//       enterName: t("Enter Name"),
//       enterDescription: t("Enter Description"),
//     };
//     return res.status(STATUS_CODE.success).json(responseData);
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * To Edit group details.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns success of failed.
 */
export const editGroup = async (req, res, next) => {
  try {
    const { error } = validation.editPayload(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    const groupInfo = await userInfo({ _id: req.body.group, status: USER_STATUS.active });
    if (!groupInfo.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Group not found" });
    const isMember = await chatInfo({ chat: req.body.group, user: req.user._id, status: USER_STATUS.active });
    if (!isMember) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Not a member of this group" });
    }
    if (isMember.role !== MEMBER_GROUP_ROLE.admin || !groupInfo.data.settings.member.editDetails || isMember.role !== MEMBER_GROUP_ROLE.superAdmin)
      return res.status(STATUS_CODE.bad_request).json({
        success: false,
        message: "Required permission to edit this group",
      });
    let savedData = {};
    if (req.file) savedData = await Storage.uploadFile(req.file);
    if (savedData.success) {
      const fileDetails = await addFile(savedData.data);
      if (!fileDetails.success) {
        return res
          .status(STATUS_CODE.bad_request)
          .json({ success: false, message: fileDetails.message });
      }
      req.body.avatar = savedData.data.media;
    }
    const response = await updateUserDetails(
      { _id: req.body.group },
      req.body
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });

    if (response.success) {
      handleGroupUpdate({
        id: req.body.group,
        action: NOTIFICATION_ACTION.group_edited,
        user: req.user,
      });
      // socketGroupNotify({
      //   user: req.user,
      //   group: req.body.group,
      //   receiverType: RECEIVER_TYPE.group,
      //   status: MESSAGE_STATUS.notify,
      //   contentType: CONTENT_TYPE.notification,
      //   action: NOTIFICATION_ACTION.group_edited,
      //   req: req,
      // });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, data: response.data });
  } catch (error) {
    next(error);
  }
};

// export const deleteDialog = async (req, res, next) => {
//   try {
//     const isMember = await groupuser(req.params.group, req.user._id);
//     if (!isMember.success) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Not a member of this group" });
//     }
//     if (!isMember.data.admin)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Required permission to add user in this group" });
//     const t = req.t;
//     return res.status(STATUS_CODE.success).json({
//       dialog: {
//         title: t("Delete Group"),
//         description: t("Are you sure want to delete this group ?"),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Delete"),
//             apiUrl: `/group/delete`,
//             apiMethod: "DELETE",
//             apiParams: {
//               group: req.params.group,
//             },
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const deleteGroup = async (req, res, next) => {
  try {
    const { error } = groupId({ group: req.body.group });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    const isAdmin = await chatInfo({
      chat: req.body.group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Not a member of this group/admin of this group" });
    }
    const response = await updateUserDetails(
      { _id: req.body.group },
      { status: USER_STATUS.deleted }
    );
    if (!response.success) {
      handleGroupUpdate({
        id: req.body.group,
        action: NOTIFICATION_ACTION.group_deleted,
        user: req.user,
      });
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    }
    // let messageData = {
    //   sender: req.user._id,
    //   receiver: req.body.group,
    //   receiverType: RECEIVER_TYPE.group,
    //   status: MESSAGE_STATUS.notify,
    //   contentType: CONTENT_TYPE.notification,
    //   action: NOTIFICATION_ACTION.group_deleted,
    // };
    // const message = await services.createMessage(messageData);
    // const receiver = await getGroupDetails(req.body.group);

    // if (receiver.success) {
    //   handleNewMessage({
    //     message: {
    //       ...message.data.toJSON(),
    //       req,
    //       groupUpdates: { groupDeleted: true },
    //     },
    //     receiver: receiver.data,
    //   });
    // }

    return res
      .status(STATUS_CODE.success)
      .json({ message: "Group Delete Successfully" });
  } catch (error) {
    next(error);
  }
};

// export const leaveGroupDialog = async (req, res, next) => {
//   try {
//     const t = req.t;
//     return res.status(STATUS_CODE.success).json({
//       dialog: {
//         title: t("Leave Group"),
//         description: t("Are you sure?  Want to leave this group."),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Leave"),
//             apiUrl: `/group/leave`,
//             apiMethod: "POST",
//             apiParams: {
//               group: req.params.group,
//             },
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const leaveGroup = async (req, res, next) => {
  try {
    const { error } = groupId({ group: req.body.group });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    const isAdmin = await chatInfo({
      chat: req.body.group,
      user: req.user._id,
      role: { $in: [MEMBER_GROUP_ROLE.superAdmin, MEMBER_GROUP_ROLE.admin] },
    });
    if (isAdmin) {
      const adminMembers = await findChats({
        chat: req.body.group,
        role: { $in: [MEMBER_GROUP_ROLE.superAdmin, MEMBER_GROUP_ROLE.admin] },
        user: { $ne: req.user._id },
        status: USER_STATUS.active,
      });
      if (!adminMembers.length)
        return res.status(STATUS_CODE.bad_request).json({
          message:
            "As an admin of this group, you cannot leave until you assign another admin. Please select a new admin before you exit.",
        });
    }
    const response = await updateChatInfo(
      {
        chat: req.body.group,
        user: req.user._id,
      },
      { status: USER_STATUS.inactive, role: MEMBER_GROUP_ROLE.member }
    );
    if (response) {
      handleGroupUpdate({
        id: req.body.group,
        action: NOTIFICATION_ACTION.left,
        user: req.user,
      });
      services.handleGroupLeave({
        user: req.user._id,
        receiver: req.body.group,
      });
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Successfully Leaved from group" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

// export const makeAdmin = async (req, res, next) => {
//   try {
//     const { group, member } = req.body;
//     const { error } = groupId({ group: req.body.group });
//     if (error)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: error.message });
//     if (!group || !member)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Required Group Id/MemberId" });
//     const response = await updateGroupUserData(
//       {
//         group: group,
//         user: member,
//         status: USER_STATUS.active,
//       },
//       { role: MEMBER_GROUP_ROLE.admin }
//     );
//     if (response.success) {
//       const userDetails = await userDetail({ _id: member });
//       if (userDetails) {
//         handleGroupUpdate({
//           id: group,
//           action: NOTIFICATION_ACTION.made_admin,
//           user: req.user,
//           members: [member],
//         });
//         // socketGroupNotify({
//         //   user: req.user,
//         //   group,
//         //   receiverType: RECEIVER_TYPE.group,
//         //   status: MESSAGE_STATUS.notify,
//         //   contentType: CONTENT_TYPE.notification,
//         //   action: NOTIFICATION_ACTION.made_admin,
//         //   actionOn: member,
//         //   groupUpdates: { youAreAdmin: true },
//         //   updateTo: [`user_${req.user._id}`],
//         //   req: req,
//         // });
//         return res
//           .status(STATUS_CODE.success)
//           .json({ message: "Successfully made from group admin" });
//       }
//     }
//     return res
//       .status(STATUS_CODE.bad_request)
//       .json({ message: response.message });
//   } catch (error) {
//     next(error);
//   }
// };

export const details = async (req, res, next) => {
  try {
    const user = req.user._id;
    const group = req.params.group;
    const { error } = groupId({ group: group });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const member = await chatInfo({
      chat: group,
      user: req.user._id,
      // status:[ USER_STATUS.active]
    }, { lastMessage: 0 });
    if (!member) {
      return res.status(STATUS_CODE.bad_request).json({
        success: false,
        message: "you are not a member of this group",
      });
    }
    const response = await getProfile(group, user);
    if (!response.success)
      return res
        .status(STATUS_CODE.server_error)
        .json({ success: false, message: "not able to get profile" });
        
    let pendingMembers = 0;
    let totalMembers = 0;
    response.data.members.forEach((member) => {
      if (
        member.status == USER_STATUS.active &&
        member.user.status == USER_STATUS.active
      )
        totalMembers++;
      if (
        member.status == USER_STATUS.pending &&
        member.user.status == USER_STATUS.active
      )
        pendingMembers++;

      // if(member?.user?.avatar){
      //   member.user.avatar = `${process.env.IMAGE_URL}${member.user.avatar}`;
      // }
    });
    // const member = response.data.members.find(
    //   (member) => String(member.user._id) == String(user)
    // );
    response.data.member = member;
    if (member) {
      response.data.superAdmin =
        member.role == MEMBER_GROUP_ROLE.superAdmin
          ? true
          : false;
      response.data.admin = (response.data.superAdmin || member.role == MEMBER_GROUP_ROLE.admin) ? true : false;
    } else {
      response.data.superAdmin = false;
      response.data.admin = false;
    }
    return res
      .status(STATUS_CODE.success)
      .json({ ...response.data, totalMembers, pendingMembers });
  } catch (error) {
    next(error);
  }
};

export const validatePassword = async (req, res, next) => {
  try {
    const { error } = validateVerifyPass(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    const { group, password } = req.body;
    const response = await userInfo({
      _id: group,
      status: USER_STATUS.active,
      type: GROUP_TYPE.password_protected,
    });

    if (response.success) {
      bcrypt.compare(password, response.data.password, (err, result) => {
        if (err) {
          return res.status(STATUS_CODE.server_error).json({
            success: false,
            message: "Something went wrong while comparing passwords",
          });
        }
        if (result) {
          return res
            .status(STATUS_CODE.success)
            .json({ success: true, message: "Password is correct" });
        } else {
          return res
            .status(STATUS_CODE.success)
            .json({ success: false, message: "Password is incorrect !!" });
        }
      });
    } else {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Not a valid group" });
    }
  } catch (error) {
    next(error);
  }
};

export const changeMemberRole = async (req, res, next) => {
  try {
    const { error } = validation.changeMemberRole(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { group, member, role } = req.body;
    const groupDetails = await userInfo({ _id: group, status: USER_STATUS.active });
    if (!groupDetails.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "group details not found" });

    const memberDeatils = await chatInfo({
      user: req.user._id,
      chat: group,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!memberDeatils)
      return res.status(STATUS_CODE.bad_request).json(response);
    const response = await updateChatInfo(
      {
        chat: group,
        user: member,
        status: USER_STATUS.active,
      },
      { $set: { role: role } },
      { new: true }
    );
    if (response) {
      handleGroupUpdate({
        id: group,
        action:
          role == MEMBER_GROUP_ROLE.member
            ? NOTIFICATION_ACTION.dismiss_admin
            : NOTIFICATION_ACTION.made_admin,
        user: req.user,
        members: [member],
      });
      // socketGroupNotify({
      //   user: req.user,
      //   group,
      //   receiverType: RECEIVER_TYPE.group,
      //   status: MESSAGE_STATUS.notify,
      //   contentType: CONTENT_TYPE.notification,
      //   action: NOTIFICATION_ACTION.dismiss_admin,
      //   actionOn: req.body.member,
      //   req: req,
      // });
      return res.status(STATUS_CODE.success).json({
        success: true,
        message: "Successfully dismissed as admin",
      });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: "you are not an admin of this group" });
  } catch (error) {
    next(error);
  }
};

export const changePass = async (req, res, next) => {
  try {
    const { error } = changePassVerify(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { group, email, otp, password } = req.body;
    const response = await userInfo({
      _id: group,
      status: USER_STATUS.active,
      type: GROUP_TYPE.password_protected,
    });
    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "You are not admin of this group" });
    const userDetails = await updateUserDetails(
      { _id: req.user._id, email: email, otp },
      { $unset: { otp: "", otpExpiry: "" } }
    );
    if (!userDetails.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "user details not found" });
    response.data.password = await bcrypt.hash(password, 10);
    await response.data.save();
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Password changed" });
  } catch (error) {
    next(error);
  }
};

// export const getSettings = async (req, res, next) => {
//   try {
//     const { group } = req.body;
//     if (!group) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "Required Group Id" });
//     }

//     const response = await validGroup({ _id: group });
//     if (response.success) {
//       const res = await groupUserInfo({
//         group: group,
//         user: req.user._id,
//         status: USER_STATUS.active,
//         role: MEMBER_GROUP_ROLE.admin,
//       });
//       if (!res)
//         return res.status(STATUS_CODE.bad_request).json({
//           success: false,
//           message: "you dont have rights/you are not admin",
//         });

//       let settingSkeleton = [
//         {
//           type: "section",
//           label: t("Members Can"),
//           parts: [
//             {
//               type: "button",
//               id: "editGroupPermission",
//               name: "editGroupPermission",
//               apiUrl: "/editGroupPermission",
//               apiMethod: "Post",
//               label: t("Edit Group Settings"),
//               description: t(`enabled, all group members will see
//               edit option for this group and can edit
//               group title, photo and description`),
//             },
//             {
//               type: "button",
//               id: "sendMessagePermission",
//               name: "sendMessagePermission",
//               apiUrl: "/sendMessagePermission",
//               apiMethod: "Post",
//               label: t("Send Messages"),
//               description: t(`If disabled, then only admins will be able
//               to send messages in this group`),
//             },
//             {
//               type: "button",
//               id: "addOtherMembersPermission",
//               name: "addOtherMembersPermission",
//               apiUrl: "/addOtherMembersPermission",
//               apiMethod: "Post",
//               label: t("Add Other Members"),
//             },
//           ],
//         },
//         {
//           type: "section",
//           label: t("Admins Can"),
//           parts: [
//             {
//               type: "button",
//               id: "approvePermission",
//               name: "approvePermission",
//               apiUrl: "/approvePermission",
//               apiMethod: "Post",
//               label: t("Approve New Members"),
//               description: t(`When turned on, admins will have to
//               approve new members before joining
//               this group`),
//             },
//           ],
//         },
//         {
//           type: "button",
//           id: "admins",
//           name: "admins",
//           apiUrl: "/admin",
//           apiMethod: "get",
//           label: t("Group Admins"),
//         },
//         {
//           type: "button",
//           id: "password",
//           name: "password",
//           apiUrl: "/change-password",
//           apiMethod: "post",
//           label: t("Change Password"),
//         },
//       ];
//     } else {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: "Not a valid group" });
//     }
//   } catch (error) {
//     next(error);
//   }
// };

export const pendingMembers = async (req, res, next) => {
  try {
    const { group } = req.params;
    const { error } = groupId({ group });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: message.error });
    }
    const user = req.user._id;
    const groupDetails = await userInfo({ _id: group, status: USER_STATUS.active });
    if (!groupDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: groupDetails.message });
    }
    const isAdmin = await chatInfo({
      chat: group,
      user: user,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
      status: USER_STATUS.active,
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "you are not a admin" });
    const response = await getpendingMembers({ group, user });
    if (response.success) {
      // let members = response.data?.map((data) => data?.pendingUsers[0]);
      return res.status(STATUS_CODE.success).json(response.data);
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: response.message });
  } catch (error) {
    next(error);
  }
};

export const editPending = async (req, res, next) => {
  try {
    const { error } = validation.editPending(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    let { group, user, accept } = req.body;
    const groupDetails = await userInfo({ _id: group, status: USER_STATUS.active });
    if (!groupDetails.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: groupDetails.message });
    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
      status: USER_STATUS.active,
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "You are not admin of this group" });
    if (accept) {
      const userData = await userInfo({ _id: user }, userProject());
      if (!userData.success)
        return res.status(STATUS_CODE.bad_request).json(user);
      await groupUserAdd({
        users: [user],
        group,
        role: MEMBER_GROUP_ROLE.member,
        user: userData.data,
        action: NOTIFICATION_ACTION.joined,
      });
    } else {
      await updateChatInfo(
        { chat: group, user },
        { $set: { status: USER_STATUS.deleted } }
      );
      handleGroupJoinRequest({ group, pending: -1 });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Successfully updated" });
  } catch (error) {
    next(error);
  }
};

// export const getGroupSetting = async (req, res, next) => {
//   const group = req.params.group;
//   const t = req.t;
//   const { error } = validation.groupSetting({ group: group });
//   if (error)
//     return res.status(STATUS_CODE.bad_request).json({ message: error });
//   try {
//     const isAdmin = await groupUserInfo({
//       group: group,
//       user: req?.user._id?.toString(),
//       status: USER_STATUS.active,
//       role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
//     });

//     if (!isAdmin.success)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: "you don't have rights" });

//     const response = await groupInfo({
//       _id: group,
//       status: true,
//     });
//     let allUser = await groupUserList({
//       group,
//       status: true,
//       user: req.user._id,
//     });
//     let allAdmins = [];
//     allUser.data?.users?.forEach((user) => {
//       if (
//         user.role == MEMBER_GROUP_ROLE.admin ||
//         user.role == MEMBER_GROUP_ROLE.superAdmin
//       ) {
//         allAdmins.push(user?.user?.name);
//       }
//     });

//     if (response.success)
//       return res.status(STATUS_CODE.success).send({
//         success: true,
//         data: {
//           settings: response.data?.settings,
//           members: allUser.data.users,
//         },
//       });
//     return res
//       .status(STATUS_CODE.bad_request)
//       .send({ success: false, message: response.message });
//   } catch (error) {
//     next(error);
//   }
// };

export const changeGroupSetting = async (req, res, next) => {
  try {
    const { error } = validation.groupSetting(req.body);
    if (error)
      return res.status(STATUS_CODE.bad_request).json({ message: error });
    const isAdmin = await chatInfo({
      chat: req.body.group,
      user: req.user._id,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
      status: USER_STATUS.active
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "you don't have rights" });

    // group: Joi.string().required(),
    // //for members
    // editDetails: Joi.boolean(),
    // sendMessage: Joi.boolean(),
    // addMember: Joi.boolean(),

    // let avaliableKeys = {
    //   editDetails: {
    //     key: "settings.member.editDetails",
    //     message: "Now members can edit group details",
    //   },
    //   sendMessage: {
    //     key: "settings.member.sendMessage",
    //     message: "Only group admin can send message",
    //   },
    //   addMember: {
    //     key: "settings.member.addMember",
    //     message: "Members can add other members",
    //   },
    //   approveMember: {
    //     key: "settings.admin.approveMember",
    //     message: "Admin need to approve new members",
    //   },
    // };
    // let updateKey = {};
    // let settingChanges = {};
    // let text = "";
    // Object.keys(avaliableKeys).forEach((key) => {
    //   if (key in req.body) {
    //     updateKey[avaliableKeys[key].key] = req.body[key];
    //     text = avaliableKeys[key].message;
    //     settingChanges[key] = req.body[key];
    //   }
    // });
    const response = await updateGroupDetails(
      {
        _id: req.body.group,
        status: USER_STATUS.active,
        receiverType: RECEIVER_TYPE.group
      },
      { $set: { settings: req.body.settings } }
    );
    if (response.success) {
      handleGroupUpdate({
        id: req.body.group,
        action: NOTIFICATION_ACTION.group_setting_changed,
        user: req.user,
      });

      // const receiver = await getGroupDetails(req.body.group);
      // let messageData = {
      //   sender: req.user._id,
      //   receiver: req.body.group,
      //   receiverType: RECEIVER_TYPE.group,
      //   status: MESSAGE_STATUS.notify,
      //   contentType: CONTENT_TYPE.notification,
      //   action: NOTIFICATION_ACTION.group_setting_changed,
      // };
      // const message = await services.createMessage(messageData);
      // if (response.success) {
      //   handleNewMessage({
      //     message: message.data.toJSON(),
      //     receiver: receiver.data,
      //     sender: req.user,
      //   });
      return res.status(STATUS_CODE.success).json({
        success: true,
        data: response.data.settings,
        message: "Successfully changed Setting",
      });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: response.message });
  } catch (error) {
    next(error);
  }
};

export const inviteLink = async (req, res, next) => {
  try {
    const group = req.params.group;
    const response = await userInfo({
      _id: group,
      status: USER_STATUS.active,
    });
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);

    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "you don't have rights" });
    const clientDomain = await getGeneralSetting({ key: GENERAL_SETTING_KEY.domain });
    if (!clientDomain.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Error while generating link" });
    }
    const groupUrl = `${clientDomain.data.domain}/group-join/${response.data.link}`;
    return res.status(STATUS_CODE.success).json(groupUrl);
  } catch (error) {
    next(error);
  }
};

export const resetLink = async (req, res) => {
  try {
    const group = req.params.group;
    const response = await userInfo({
      _id: group,
      status: USER_STATUS.active,
    });
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);

    const isAdmin = await chatInfo({
      group: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "you don't have rights" });

    const updateGroupLink = await updateGroupDetails(
      { _id: group, status: USER_STATUS.active },
      { link: uuidv4() }
    );
    if (!updateGroupLink.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Error while reseting link" });
    }
    const clientDomain = await getGeneralSetting({ key: GENERAL_SETTING_KEY.domain });
    if (!clientDomain.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Error while generating link" });
    }
    const groupUrl = `${clientDomain.data.domain}/group-join/${updateGroupLink.data.link}`;
    return res.status(STATUS_CODE.success).json(groupUrl);
  } catch (error) {
    next(error);
  }

  // try {
  //   const group = req.params.group;
  //   const t = req.t;
  //   const { error } = validation.groupSetting({ group });
  //   if (error)
  //     return res.status(STATUS_CODE.bad_request).json({ message: error });
  //   const isAdmin = await groupUserInfo({
  //     group: group,
  //     user: req?.user._id?.toString(),
  //     status: USER_STATUS.active,
  //     role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
  //   });
  //   if (!isAdmin.success)
  //     return res
  //       .status(STATUS_CODE.bad_request)
  //       .json({ success: false, message: "you don't have rights" });

  //   const response = await groupInfo({
  //     _id: group,
  //     status: true,
  //   });
  //   let setLink = response?.data?.link;
  //   if (response) {
  //     const secretKey = SECRET_KEY;
  //     const payload = {
  //       groupId: response.data._id,
  //       user: "group",
  //     };
  //     const token = Jwt.sign(payload, secretKey);
  //     const baseUrl = `${SERVER_URL}/api/group/join/${token}`;
  //     setLink = await updateGroupDetails(
  //       { _id: response.data._id },
  //       { $set: { link: baseUrl } }
  //     );

  //     const buffer = await qrcode.toBuffer(setLink.data.link, {
  //       type: "png",
  //       color: {
  //         dark: "#000000", // QR code color
  //         light: "#ffffff", // Background color
  //       },
  //     });

  //     const form = new FormData();
  //     form.append("file", buffer, {
  //       filename: "qr_code.png",
  //       contentType: "image/png",
  //     });

  //     const formHeaders = form.getHeaders();

  //     const uploadLink = await axios.post(
  //       `${SERVER_URL}/api/uploadFile`,
  //       form,
  //       {
  //         headers: {
  //           ...formHeaders,
  //         },
  //       }
  //     );
  //     if (uploadLink) {
  //       let link = uploadLink.data.link;
  //       let check = await updateGroupDetails(
  //         { _id: response.data._id },
  //         { $set: { qrcode: link } }
  //       );
  //       console.log(check.data.qrcode, "qr created after reset link");
  //     }
  //   }

  //   if (response.success)
  //     return res.status(STATUS_CODE.success).send({
  //       changedLink: setLink.data.link,
  //       qrLink: check.data.qrcode,
  //       data: response.data,
  //     });
  //   return res
  //     .status(STATUS_CODE.bad_request)
  //     .send({ success: false, message: response.message });
  // } catch (error) {
  //   next(error);
  // }
};

export const getQrPage = async (req, res, next) => {
  try {
    const group = req.params.group;
    const response = await userInfo({
      _id: group,
      status: USER_STATUS.active,
    });
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);

    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "you don't have rights" });
    const clientDomain = await getGeneralSetting({ key: GENERAL_SETTING_KEY.domain });
    if (!clientDomain.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Error while generating link" });
    }
    const groupUrl = `${clientDomain.data.domain}/group-join/${response.data.link}`;
    const QR = await QRCode.toDataURL(groupUrl);
    return res.status(STATUS_CODE.success).send(QR);
  } catch (error) {
    next(error);
  }
};

export const validateInviteLink = async (req, res, next) => {
  const token = req.params.token;
  const user = req.user;
  // console.log(token);
  try {
    // const decodedData = Jwt.verify(token, SECRET_KEY);
    // if (!decodedData) {
    //   return res
    //     .status(STATUS_CODE.bad_request)
    //     .json({ success: false, message: " Not valid link" });
    // }
    const response = await userInfo(
      {
        link: token,
        status: USER_STATUS.active,
      },
      { avatar: 1, name: 1, createdBy: 1, createdAt: 1, settings: 1 }
    );
    if (!response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Link doesn't exist." });
    }
    // if (!(group.link === `${SERVER_URL}/api/group/join/${token}`)) {
    //   return res.status(STATUS_CODE.bad_request).json({
    //     success: false,
    //     message: "Group Link changed",
    //   });
    // }
    const group = response.data.toJSON();
    const isMember = await chatInfo({
      user: user._id,
      chat: group._id,
      status: { $in: [USER_STATUS.active, USER_STATUS.pending] },
    });
    if (isMember)
      return res.status(STATUS_CODE.success).json({
        alreadyMember:
          isMember.status == USER_STATUS.active ? true : false,
        ...group,
        // api: {
        //   apiUrl: `${SERVER_URL}/api/message/${group._id}/group`,
        //   apiMethod: "POST",
        // },
      });

    const members = await groupMembers({
      group: new mongoose.Types.ObjectId(group._id),
      status: USER_STATUS.active,
    });
    group.approveMember = group.settings.admin.approveMember;
    delete group.settings;
    let groupCreator = members.find(
      (member) => String(member._id) == String(group.createdBy)
    );
    if (!groupCreator) {
      const response = await userInfo({ _id: group.createdBy }, userProject());
      if (response.success) groupCreator = response.data;
    }
    return res.status(STATUS_CODE.success).json({
      alreadyMember: false,
      alreadyRequested:
        isMember && isMember.status == USER_STATUS.pending
          ? true
          : false,
      ...group,
      members,
      createdBy: groupCreator,
    });
    // if (group.settings.admin.approveMember) {
    //   const response = await userDetail({
    //     _id: group.createdBy,
    //   });
    //   let allUser = await groupUserList({
    //     group,
    //     status: true,
    //     user: req.user._id,
    //   });
    //   let allAdmins = [];
    //   allUser.data?.users?.forEach((user) => {
    //     if (
    //       user.role == MEMBER_GROUP_ROLE.admin ||
    //       user.role == MEMBER_GROUP_ROLE.superAdmin
    //     ) {
    //       allAdmins.push(user?.user?.name);
    //     }
    //   });

    //   let isMember = await groupUserInfo({
    //     user: user._id,
    //     group: group._id,
    //     status: USER_STATUS.pending,
    //   });

    //   // const menu = {
    //   //   avatar: group.avatar,
    //   //   name: group.name,
    //   //   createdBy: t(
    //   //     `Created by ${response.data.name} on ${dateConverter(
    //   //       group.createdAt,
    //   //       user?.timezone ? user?.timezone : "America/New_York",
    //   //       user?.local
    //   //     )}`
    //   //   ),

    //   //   description: t("An admin must approve your request"),
    //   //   requested: isMember.data ? true : false,
    //   //   requestJoin: {
    //   //     label: t("Request to Join"),
    //   //     apiUrl: "/group/join-req/",
    //   //     apiMethod: "POST",
    //   //     apiParams: {
    //   //       member: user._id,
    //   //       group: group._id,
    //   //       join: true,
    //   //     },
    //   //   },
    //   //   cancelJoin: {
    //   //     label: t("Cancel  Request"),
    //   //     apiUrl: "/group/join-req/",
    //   //     apiMethod: "POST",
    //   //     apiParams: {
    //   //       member: user._id,
    //   //       group: group._id,
    //   //       join: false,
    //   //     },
    //   //   },
    //   //   cancel: t("Cancel"),
    //   // };
    //   return res.status(STATUS_CODE.success).json({
    //     data: { group, admins: allAdmins },
    //   });
    // }
    // let isMember = await groupUserInfo({
    //   user: user._id,
    //   group: group._id,
    //   status: USER_STATUS.active,
    // });

    // if (!isMember.data) {
    //   const groupUser = await groupUserAdd({
    //     users: [user._id],
    //     group: group._id,
    //     role: MEMBER_GROUP_ROLE.member,

    //     user: req.user,
    //   });
    //   if (!groupUser.success) {
    //     return res.status(STATUS_CODE.bad_request).send({
    //       success: false,
    //       message: "Error while addeding member trough link",
    //     });
    //   }
    // }
  } catch (error) {
    console.log(error, "error");
    next(error);
  }
};

export const joinInviteLink = async (req, res, next) => {
  try {
    const { error } = validation.reqToGroup(req.body);
    if (error)
      return res.status(STATUS_CODE.bad_request).json({ message: error });
    const user = req.user._id;
    const { group, link } = req.body;
    const groupDetails = await userInfo({
      _id: group,
      link,
      status: USER_STATUS.active,
    });
    if (!groupDetails.success)
      return res.status(STATUS_CODE.bad_request).json(groupDetails);

    let isMember = await chatInfo({
      user: user,
      chat: group,
      status: USER_STATUS.active,
    });
    if (isMember) {
      return res.status(STATUS_CODE.bad_request).send({
        success: false,
        message: "you are already a member",
      });
    }
    if (groupDetails.data.settings.admin.approveMember) {
      const response = await updateChatInfo(
        { chat: group, user },
        { role: MEMBER_GROUP_ROLE.member, status: USER_STATUS.pending },
        {
          new: true, upsert: true
        }
      );
      if (response) {
        handleGroupJoinRequest({ group: group, pending: 1 });
        return res
          .status(STATUS_CODE.success)
          .json({ message: "Request added successfully" });
      }
      return res.status(STATUS_CODE.bad_request).json(response);
    }
    const response = await groupUserAdd({
      users: [user],
      group,
      user: req.user,
      action: NOTIFICATION_ACTION.joined,
    });
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const cancelJoinRequest = async (req, res, next) => {
  try {
    const { error } = validation.reqToGroup(req.body);
    if (error)
      return res.status(STATUS_CODE.bad_request).json({ message: error });
    const user = req.user._id;
    const { group, link } = req.body;
    const groupDetails = await userInfo({
      _id: group,
      link,
      status: USER_STATUS.active,
    });
    if (!groupDetails.success)
      return res.status(STATUS_CODE.bad_request).json(groupDetails);

    let isMember = await chatInfo({
      user: user,
      chat: group,
      status: USER_STATUS.pending,
    });
    if (!isMember) {
      return res.status(STATUS_CODE.bad_request).send({
        success: false,
        message: "Request not found",
      });
    }
    isMember.data.status = USER_STATUS.deleted;
    isMember.data.save();
    handleGroupJoinRequest({ group, pending: -1 });
    return res
      .status(STATUS_CODE.success)
      .json({ message: "Request cancelled successfully" });
  } catch (error) {
    next(error);
  }
};

// export const chooseAdmin = async (req, res) => {
//   try {
//     const group = req.params.group;
//     const { error } = validation.validateGroupId({ group: group });
//     if (error) {
//       return res.status(STATUS_CODE.bad_request).json({ message: error });
//     }

//     const members = await getGroupDetails(
//       group,
//       [MEMBER_GROUP_ROLE.member],
//       true,
//       req.user._id
//     );
//     if (!members.success) {
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: members.message });
//     }
//     const membersList = members.data.members.map((member) => member.user);

//     res.status(STATUS_CODE.success).json({ data: { membersList } });
//   } catch (error) {
//     console.log(error, "error");
//     return res
//       .status(STATUS_CODE.server_error)
//       .json({ success: false, error: error.message });
//   }
// };

export const groupForgotPassword = async (req, res) => {
  try {
    const { error } = validation.groupForgetPassword(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const { group } = req.body;
    const groupDetails = await userInfo({
      _id: group,
      status: USER_STATUS.active,
      type: GROUP_TYPE.password_protected,
    });
    if (!groupDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Group details not found" });
    }
    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "You are not a admin" });
    }
    const OTP = generateOTP();
    const userDetails = await updateUserDetails(
      {
        _id: req.user._id,
        email: req.body.email,
        status: USER_STATUS.active,
      },
      {
        otp: OTP,
        otpExpiry: moment().add(10, "minutes"),
      }
    );
    if (!userDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Email doesn't found" });
    }
    const mail = await sendMail({
      to: req.body.email,
      subject: "OTP VERIFICATION",
      body: `NEW OTP IS : ${OTP}`,
    });
    if (mail.success)
      return res.status(STATUS_CODE.success).json({
        success: true,
        message: "new otp has been sended to you mail. ",
      });
    return res.status(STATUS_CODE.bad_request).json({
      success: false,
      message: "Error while sending OTP, retry again..",
    });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, error: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { error } = validation.groupForgetPassword(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const { group } = req.body;
    const groupDetails = await userInfo({
      _id: group,
      status: USER_STATUS.active,
      type: GROUP_TYPE.password_protected,
    });
    if (!groupDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Group details not found" });
    }
    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "You are not a admin" });
    }
    const userDetails = await userInfo(
      { _id: req.user._id, email: req.body.email, status: USER_STATUS.active },
      { otp: 1 }
    );
    if (!userDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Email doesn't found" });
    }
    if (!userDetails.data.otp) {
      userDetails.data.otp = generateOTP();
      await userDetails.data.save();
    }
    const mail = await sendMail({
      to: req.body.email,
      subject: "OTP VERIFICATION",
      body: `NEW OTP IS : ${userDetails.data.otp}`,
    });
    if (mail.success)
      return res.status(STATUS_CODE.success).json({
        success: true,
        message: "new otp has been sended to you mail. ",
      });
    return res.status(STATUS_CODE.bad_request).json({
      success: false,
      message: "Error while sending OTP, retry again..",
    });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, error: error.message });
  }
};

export const verifyGroupOtp = async (req, res) => {
  try {
    const group = req.body.group;
    const otp = req.body.otp;
    const { error } = validation.groupId({ group: group });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const groupDetails = await userInfo({
      _id: group,
      status: USER_STATUS.active,
      type: GROUP_TYPE.password_protected,
    });
    if (!groupDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Group details not found" });
    }
    const isAdmin = await chatInfo({
      chat: group,
      user: req.user._id,
      status: USER_STATUS.active,
      role: { $in: [MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin] },
    });
    if (!isAdmin) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "You are not a admin" });
    }
    const otpVerified = await userInfo({
      _id: req.user._id,
      status: USER_STATUS.active,
      otp: otp,
      otpExpiry: { $gt: new Date() },
    });
    if (!otpVerified.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Invalid OTP" });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "OTP Verified" });
  } catch (error) {
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, error: error.message });
  }
};

// export const getAdminToMessage = async (req, res, next) => {
//   try {
//     const { group } = req.body;
//     const user = req.user._id;
//     const { error } = validation.validateGroupId({ group: group });
//     if (error) {
//       res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: error.message });
//     }
//     const response = await getProfile(group, user);
//     if (!response.success)
//       res
//         .status(STATUS_CODE.bad_request)
//         .json({ success: false, message: response.message });

//     res
//       .status(STATUS_CODE.success)
//       .json({ data: { admins: response.data[0].adminDetail } });
//   } catch (error) {
//     next(error);
//   }
// };

export const members = async (req, res, next) => {
  try {
    const groupDetails = await userInfo({ _id: req.params.id, status: USER_STATUS.active, receiverType: RECEIVER_TYPE.group });
    if (!groupDetails.success)
      return res.status(STATUS_CODE.bad_request).json(groupDetails);
    const query = req.query;
    const response = await groupUserList({
      group: req.params.id,
      page: query.page,
      limit: query.limit,
      status: USER_STATUS.active,
      user: req.user._id,
      value: query.search,
      key: "name",
    });
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};
