import bcrypt from "bcrypt";
import fs from "fs";
import i18next from "i18next";
import { isValidObjectId } from "mongoose";
import path from "path";
import { BLOCK_TYPE, CONTENT_TYPE, GENERAL_SETTING_KEY, MESSAGE_STATUS, NOTIFICATION_ACTION, RECEIVER_TYPE, REPORT_TYPE, STATUS_CODE, USER_STATUS } from "../../config/constant.js";
import { leaveGroup } from "../../helpers/index.js";
import { handleNewMessage, messageReceiver } from "../../helpers/message.js";
import { blockChat, updateChatInfo } from "../../models/chat.js";
import { addFile } from "../../models/filemanager.js";
import { getGeneralSetting } from "../../models/generalSetting.js";
import { getGroupDetails } from "../../models/group.js";
import { getLanguage } from "../../models/language.js";
import { createMessage, messageInfo } from "../../models/message.js";
import { userProject } from "../../models/pipe/user.js";
import { newReport } from "../../models/report.js";
import { getRole } from "../../models/role.js";
import userModel from "../../models/schema/user.js";
import { updateUserDetails, userDetail, userInfo } from "../../models/user.js";
import { genrateJwtToken } from "../../utils/common.js";
import Storage from "../../utils/storage.js";
import keywords from "../../utils/translation.js";
import { getGeneralSettingSchema } from "../../validation/admin.js";
import * as validation from "../../validation/user.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const modulesDir = path.join(__dirname, '../modules');

export const registration = async (req, res, next) => {
  try {
    const { error } = validation.registrationSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const user = await userModel.findOne({ email: req.body.email });
    if (user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "user already registered" });
    }
    req.body.password = await bcrypt.hash(req.body.password, 10);
    await userModel.create(req.body);
    res.status(200).json({ message: "User Registred Successfully" });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { error } = validation.loginSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const user = await userModel
      .findOne({
        email: req.body.email,
      })
      .lean();
    if (!user) {
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ message: "user not found" });
    }
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ message: "invalid credentials" });
    }
    const userLanguage =
      user?.language &&
      (await getLanguage({
        _id: user.language,
      }));
    await i18next.changeLanguage(
      (userLanguage && userLanguage.success && userLanguage.data.key) || "en"
    );
    const t = (key) => i18next.t(key);
    return res.status(STATUS_CODE.success).json({
      token: genrateJwtToken({ _id: user._id, password: user.password }),
    });
  } catch (error) {
    next(error);
  }
};

export const chatWindow = async (req, res, next) => {
  try {
    const t = req.t;
    return res.status(STATUS_CODE.success).json([
      {
        key: "chats",
        label: t("Chats"),
        apiUrl: `/message/`,
        apiMethod: "GET",
      },
      {
        key: "groups",
        label: t("Groups"),
        apiUrl: `/group/`,
        apiMethod: "GET",
      },
      {
        key: "calls",
        label: t("Calls"),
        apiUrl: `/call/`,
        apiMethod: "GET",
      },
      {
        key: "settings",
        label: t("Settings"),
        apiUrl: `/setting/`,
        apiMethod: "GET",
      },
    ]);
  } catch (error) {
    next(error);
  }
};

export const loginUid = async (req, res, next) => {
  try {
    const { error } = validation.loginUID(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const { uid, _id } = req.body;
    const match = []
    _id && match.push({ _id: _id });
    uid && (isValidObjectId(String(uid)) ? match.push({ _id: uid }) : match.push({ uid: uid }));
    const user = await userModel
      .findOne(
        {
          $or: match,
          status: USER_STATUS.active,
        },
        userProject()
      )
      .lean();
   // console.log("user", user);
    if (!user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "user not found" });
    }
    return res.status(STATUS_CODE.success).json({
      token: genrateJwtToken({ _id: user._id, password: user.password }),
      user: user,
    });
  } catch (error) {
    next(error);
  }
};

export const report = async (req, res, next) => {
  try {
    const { error } = validation.reportSchema(req.body);
    if (error) {
      console.log(error, "error");
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { reportType, report, block, leave } = req.body;
    const user = req.user._id;
    switch (reportType) {
      case REPORT_TYPE.message: {
        const validMessage = await messageInfo({
          _id: report,
          deleted: false,
          sender: { $ne: user },
        });
        if (!validMessage.success)
          return res.status(STATUS_CODE.bad_request).json({
            success: false,
            message: "invalid message id/you are reporting your own message",
          });
        const reportResponse = await newReport({
          user: user.toString(),
          blockType: BLOCK_TYPE.message,
          ...req.body,
        });
        if (!reportResponse)
          return res
            .status(STATUS_CODE.bad_request)
            .json({ success: false, message: reportResponse.message });
        // * Blocking user message..
        if (
          block &&
          validMessage.data.receiverType == RECEIVER_TYPE.user
        ) {
          await blockChat({
            user: req.user,
            chat: validMessage.data.sender,
            status: true
          }
          );
        }
        // ** Leaving group after group
        if (leave && validMessage.data.receiverType == RECEIVER_TYPE.group) {
          const leaveReponse = await updateChatInfo({ user: user, chat: report, receiverType: RECEIVER_TYPE.group }, { status: USER_STATUS.inactive });
          if (!leaveReponse)
            return res
              .status(STATUS_CODE.bad_request)
              .json({ success: false, message: "unable to leave group" });
          const receiver = await messageReceiver({ chat: validMessage.data.receiver, user: user, receiverType: RECEIVER_TYPE.group });
          if (leaveReponse.success) {
            let messageData = {
              sender: req.user._id,
              receiver: validMessage.data.receiver,
              receiverType: RECEIVER_TYPE.group,
              status: MESSAGE_STATUS.notify,
              contentType: CONTENT_TYPE.notification,
              action: NOTIFICATION_ACTION.left,
            };
            const message = await createMessage(messageData);
            message.data["t"] = req.t;
            if (message.success) {
              handleNewMessage({
                message: { ...message.data.toJSON(), req },
                receiver: receiver.data,
              });
            }
          }
        }
        return res
          .status(STATUS_CODE.success)
          .json({ success: true, message: "Message reported successfully" });
      }

      case REPORT_TYPE.group: {
        const validGroup = await getGroupDetails(report);
        if (!validGroup.success) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ success: false, message: validGroup.message });
        }
        if (
          !validGroup.data?.members?.some(
            (member) => String(member.user._id) == String(user)
          )
        )
          return res.status(STATUS_CODE.bad_request).json({
            success: false,
            messgae: "you are not a member of this group",
          });

        const reportResponse = await newReport({
          user: user.toString(),
          blockType: BLOCK_TYPE.group,
          ...req.body,
        });

        if (!reportResponse.success)
          return res
            .status(STATUS_CODE.bad_request)
            .json({ success: false, message: reportResponse.message });
        if (leave) {
          const leaveReponse = await leaveGroup(user, report);
          if (!leaveReponse.success)
            return res
              .status(STATUS_CODE.bad_request)
              .json({ success: false, message: leaveReponse.message });

          if (leaveReponse.success) {
            const receiver = await getGroupDetails(report);
            let messageData = {
              sender: req.user._id,
              receiver: report,
              receiverType: RECEIVER_TYPE.group,
              status: MESSAGE_STATUS.notify,
              contentType: CONTENT_TYPE.notification,
              action: NOTIFICATION_ACTION.left,
            };
            const message = await createMessage(messageData);
            message.data["t"] = req.t;
            if (message.success) {
              handleNewMessage({
                message: { ...message.data.toJSON(), req },
                receiver: receiver.data,
              });
            }
          }

          return res.status(STATUS_CODE.success).json({
            success: true,
            message: "reported leaved group succesfully",
          });
        }
        return res
          .status(STATUS_CODE.success)
          .json({ success: true, message: "Group reported succesfully" });
      }

      case REPORT_TYPE.user: {
        const validUser = await userDetail({
          _id: report,
          status: USER_STATUS.active,
        });

        if (!validUser.success)
          return res
            .status(STATUS_CODE.bad_request)
            .json({ success: false, message: "invalid user" });
        const reportResponse = await newReport({
          user: user.toString(),
          blockType: BLOCK_TYPE.user,
          ...req.body,
        });
        if (!reportResponse)
          return res
            .status(STATUS_CODE.bad_request)
            .json({ success: false, message: reportResponse.message });
        if (block) {
          const blockResponse = await blockChat({ chat: report, user: req.user, status: true });
          if (!blockResponse)
            return res
              .status(STATUS_CODE.bad_request)
              .json({ success: false, message: "error while blocking user" });

          return res.status(STATUS_CODE.success).json({
            success: true,
            message: "user reported and blocked successfully",
          });
        }
        return res
          .status(STATUS_CODE.success)
          .json({ success: true, message: "user reported successfully" });
      }
      default:
        break;
    }
    res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: "No report Type matched" });
  } catch (error) {
    next(error);
  }
};

export const editProfile = async (req, res, next) => {
  try {
    const { error } = validation.editProfile(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    let savedData = {};
    if (req.file) savedData = await Storage.uploadFile(req.file);
    if (savedData.success) {
      const fileDetails = await addFile(savedData.data);
      if (!fileDetails.success) {
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: fileDetails.message });
      }
      req.body.avatar = savedData.data.media;
    }
    const user = await userModel.findOne({ _id: req.user._id });
    if (!user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "user does not exist" });
    }
    const result = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      req.body,
      { new: true }
    );
    if (!result) {
      return res
        .status(500)
        .json({ success: false, message: "something went wrong" });
    }
    res.status(200).json({
      success: true,
      data: result,
      message: "User edited Successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const about = async (req, res, next) => {
  try {
    const t = req.t;
    const user = req.user._id;
    const response = await userInfo(
      { _id: user },
      { _id: 0, about: 1, aboutOptions: 1 }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });
    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const updateAbout = async (req, res, next) => {
  try {
    const { error } = validation.aboutSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const about = req.body.about.trim();
    const response = await updateUserDetails(
      { _id: req.user._id, status: USER_STATUS.active },
      { $set: { about }, $addToSet: { aboutOptions: about } }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "user details not found" });

    return res.status(STATUS_CODE.success).json({ message: "About updated" });

  } catch (error) {
    next(error);
  }
};

export const deleteAbout = async (req, res, next) => {
  try {
    console.log("req.body", req.body);
    const { error } = validation.aboutSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const response = await updateUserDetails(
      { _id: req.user._id, status: USER_STATUS.active },
      { $pull: { aboutOptions: req.body.about.trim() } }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "updated successfully" });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePushNotificationToken = async (req, res, next) => {
  try {
    const { error } = validation.updatePushNotification(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const { id, token } = req.body;
    let result = await userModel.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $addToSet: {
          devicetokens: token,
        },
      },
      {
        new: true,
      }
    );
    if (result) {
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Token added successfully" });
    } else
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "unable to add token" });
  } catch (error) {
    next(error);
  }
};

export const removePushNotificationToken = async (req, res, next) => {
  try {
    const { error } = validation.updatePushNotification(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const { token } = req.body;
    let result = await userModel.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $pull: { devicetokens: token },
      },
      {
        new: true,
      }
    );
    if (result) {
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Token removed successfully" });
    } else
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "unable to remove token" });
  } catch (error) {
    next(error);
  }
  Ï;
};

export const translations = async (req, res, next) => {
  // Getting user Default Language
  try {
    const user = req.user;
    const userLanguage =
      user.language &&
      (await getLanguage({
        key: user.language,
      }));
    await i18next.changeLanguage(
      (userLanguage && userLanguage.success && userLanguage.data.key) || "en"
    );
    const t = (key) => {
      const value = i18next.t(key);
      return value || key;
    };
    const translations = keywords(t);
    res.status(STATUS_CODE.success).json(translations);
  } catch (error) {
    next(error);
  }
};

// export const userOptions = async (req, res, next) => {
//   const { chat, chatType, messageId, optionType } = req.body;
//   try {
//     switch (optionType) {
//       case "more_options": {
//         const t = req.t;
//         const user = req.user;
//         const blockPerm = await checkPermission(req, "block_users");
//         let userName = "";
//         if (chatType == "user") {
//           let res = await userDetail({ _id: chat });
//           if (res.success) {
//             userName = res.data.name;
//           }
//         }
//         let isArchive = (
//           await getAchive({ user: req.user._id, chat: chat, status: true })
//         ).success;

//         let resMute = (
//           await getMute({
//             user: req.user._id,
//             chat: chat,
//             status: true,
//           })
//         ).success;
//         let isUnread = await unreadInfo({
//           chat: chat,
//           user: user._id,
//           status: true,
//         });
//         if (!isUnread) {
//           const response = await chatUnreadMessages({
//             chat: chat,
//             receiverType: chatType,
//             user: user._id,
//           });
//           isUnread = response.success && response.data.length ? true : false;
//         }
//         let isMember = false;
//         let isBlock = false;
//         let isMute = resMute.mute;
//         let isRead = isUnread ? false : true;
//         if (chatType == "group") {
//           let res = await groupuser(chat, req.user._id);
//           if (res.success) {
//             isMember = res.data.public || res.data.moderator || res.data.admin;
//           }
//         } else {
//           let res = true
//           //  await friendDetails({
//           //   $or: [
//           //     {
//           //       sourceId: req.user._id,
//           //       targetId: chat,
//           //       status: FRIENDSHIP_STATUS.accepted,
//           //       messageblock: chat,
//           //     },
//           //     {
//           //       sourceId: chat,
//           //       targetId: req.user._id,
//           //       status: FRIENDSHIP_STATUS.accepted,
//           //       messageblock: chat,
//           //     },
//           //   ],
//           // });
//           if (res.success) {
//             isBlock = true;
//           }
//         }
//         let menus = {
//           profile: chatType == "user" ? t("View Profile") : t("Group Info"),
//           ...(isRead
//             ? { unread: t("Mark as unread") }
//             : { read: t("Mark as read") }),
//           ...(isMute
//             ? { unmute: t("Unmute Notifications") }
//             : { mute: t("Mute Notifications") }),
//           ...(chatType == "user"
//             ? { userReport: t("Report") }
//             : { groupReport: t("Report Group") }),
//           ...(isArchive
//             ? { unarchive: t("Unarchive") }
//             : { archive: t("Archive") }),
//           ...(chatType == "user"
//             ? { delete: t("Delete") }
//             : { exitGroup: t("Exit Group") }),
//           ...(chatType === "user"
//             ? {
//               ...(isBlock
//                 ? { unblock: t("Unblock") }
//                 : { block: t("Block") }),
//             }
//             : { delete: t("Delete Chat") }),

//           unMuteDialog: t("Unmute"),
//           muteDialog: {
//             label: t("Mute Notification"),
//             description: t(
//               "Select the duration for which you want to mute this chat.Once you are muted, you will still be notified if you are mentioned"
//             ),
//             options: {
//               hours: { label: t("8 Hours"), value: 2 },
//               week: { label: t("1 Week"), value: 3 },
//               always: { label: t("Always"), value: 1 },
//             },
//           },
//           reportUserDialog: {
//             label: t(`Report ${userName} ?`),
//             description: t(
//               "Here, you can report this user. You can also choose to report and block below."
//             ),
//             options: {
//               ...(!isBlock
//                 ? {
//                   reportBlock: t("Report and Block"),
//                 }
//                 : {}),
//               report: t("Report"),
//             },
//           },
//           reportGroupDialog: {
//             label: t(`Report Group`),
//             description: t(
//               "Here, you can report this group. You can also choose to report and exit from this group from below."
//             ),
//             buttons: {
//               ...(isMember
//                 ? {
//                   reportExit: {
//                     label: t("Report and Exit"),
//                     subDialog: {
//                       label: t("Report and Exit Group"),
//                       description: t(
//                         "Are you sure you want to report and exit this group? No one in this group will be notified that you have reported."
//                       ),
//                       confirmText: t("Yes, Report and Exit Group"),
//                     },
//                   },
//                 }
//                 : {}),
//               report: {
//                 label: t("Report"),
//                 subDialog: {
//                   label: t("Report Group"),
//                   description: t(
//                     "Are you sure you want to report this group? No one in this group will be notified that you have reported."
//                   ),
//                   confirmText: t("Yes, Report Group"),
//                 },
//               },
//             },
//           },
//           deleteChatDialog: {
//             label: t("Delete Chat"),
//             description: t(
//               "Are you sure you want to delete all messages and remove this chat from your chat list?"
//             ),
//             confirmText: t("Yes, Delete All Messages"),
//           },
//           exitDialog: {
//             label: t("Exit Group"),
//             description: t(
//               "Are you sure you want to exit this group? You will not be able to rejoin this group directly. To rejoin, you can contact group members or group admin."
//             ),
//             confirmText: t("Yes, Exit Group"),
//           },
//           blockDialog: {
//             label: t(`Block “${userName}”`),
//             description: t(
//               "Blocked contacts will no longer be able to call you or send you messages."
//             ),
//             options: {
//               reportBlock: t("Report and Block"),
//               block: t("Block"),
//             },
//           },
//           unblockDialog: t("Unblock"),
//         };
//         !blockPerm && menus["block"] && delete menus["block"];
//         !isMember && menus["exitGroup"] && delete menus["exitGroup"];

//         return res.status(STATUS_CODE.success).json(menus);
//       }
//       case "message_options": {
//         const message = await messages({
//           messageId: messageId,
//           limit: 1,
//           user: req.user._id,
//           chat: chat,
//           receiverType: chatType,
//         });
//         console.log(message, "message");

//         // const dialog = await messageDialogMaker({
//         //   message: message?.data[0],
//         //   fromMe: message?.data[0]?.fromMe,
//         //   key: message?.data[0].deleted ? "deleted_message" : "message",
//         //   t: req.t,
//         // });

//         return res
//           .status(STATUS_CODE.success)
//           .json({ success: true, menu: dialog });
//       }
//       case "user_profile": {
//         const isExist = userModel.findOne({
//           _id: chat,
//           status: USER_STATUS.active,
//         });

//         if (!isExist)
//           return res
//             .status(STATUS_CODE.bad_request)
//             .json({ success: false, message: "friend profile not exist" });

//         const response = await getProfileInfo(user, chat);
//         if (!response.success)
//           return res
//             .status(STATUS_CODE.server_error)
//             .send({ success: false, message: response.message });

//         let menu = {
//           navigationTitle: t("Contact Info"),
//           userDetails: {
//             name: response?.data[0]?.name,
//             avatar: response?.data[0]?.avatar,
//             description: response?.data[0]?.about,
//           },
//           call: t("Call"),
//           search: t("Search"),
//           userDescription: {
//             label: t("Add about"),
//             description: response.data[0].about,
//             date: response?.data[0]?.updatedAt,
//           },
//           mediaFilter: {
//             label: t("Media, Links and Docs"),
//             count: `${response.data[0].mediaCount}`,
//           },
//           starred: {
//             label: t("Starred Message"),
//             count: `${response.data[0].staredCount}`,
//           },
//           wallMuteTheme: t("wallpaper & sound"),

//           //   {
//           //     label: t("Mute"),
//           //     labelSelected: t("Unmute"),
//           //     value:
//           //       response.data[0]?.mute?.length <= 0
//           //         ? t("No")
//           //         : response.data[0]?.mute[0]?.status,
//           //     unMuteDialog: "Unmute",
//           //     muteDialog: {
//           //       label: t("Mute Notification"),
//           //       description: t(
//           //         "Select the duration for which you want to mute this chat.Once you are muted, you will still be notified if you are mentioned"
//           //       ),
//           //       options: {
//           //        hours: {  label: t("8 Hours"), value: 2 },
//           //        week: {  label: t("1 Week"), value: 3 },
//           //        always: { label: t("Always"), value: 1 },
//           //       },

//           //     },
//           //   }
//           //   {
//           //     key: "theme",
//           //     label: t("Change Theme"),
//           //     icon: `${currDir}/theme.png`,
//           //     apiUrl: "",
//           //     apiMethod: "",
//           //   },
//           // ],
//           groups: {
//             header: t(`${response.data[0].commonGroupCount} Group Common`),
//             createGroup: {
//               label: t(`Create Group With ${response.data[0].name}`),
//               apiUrl: `${SERVER_URL}/api/group/create/`,
//               apiMethod: "GET",
//               icon: `${currDir}/add.png`,
//             },
//             groupList: [...response.data[0]?.groupProfiles],
//             limit: 2,
//             seeAll: t("See All"),
//           },
//           chatClearDelete: [
//             {
//               key: "clearChat",
//               label: t("Clear Chat"),
//               apiUrl: "",
//               apiMethod: "",
//               dialog: {
//                 label: t("Clear Chat"),
//                 description: t(
//                   "Are you sure you want to Clear all messages from this chat?"
//                 ),
//                 confirmText: t("Yes, Clear All Messages"),
//                 cancel: t("Cancel"),
//               },
//             },
//             {
//               key: "deleteChat",
//               label: t("Delete Chat"),
//               apiUrl: "/chat/delete",
//               apiMethod: "POST",
//               apiParams: [
//                 {
//                   chat: friend,
//                   chatType: "user",
//                 },
//               ],

//               dialog: {
//                 label: t("Delete Chat"),
//                 description: t(
//                   "Are you sure you want to delete all messages and remove this chat from your chat list?"
//                 ),
//                 confirmText: t("Yes, Delete All Messages"),
//                 cancel: t("Cancel"),
//               },
//             },
//           ],
//           blockReport: [
//             {
//               key: "block",
//               label: t("Block"),
//               labelSelected: t("Unblock"),
//               value: response.data[0].block,

//               apiUrl: "api/block",
//               apiUrlSelected: "api/unblock",
//               apiMethod: "post",
//               blockDialog: {
//                 label: t(`Block “${response.data[0].name}”`),
//                 description: t(
//                   "Blocked contacts will no longer be able to call you or send you messages."
//                 ),
//                 buttons: [
//                   {
//                     key: "reportBlock",
//                     label: t("Report and Block"),
//                     apiUrl: "/user/report",
//                     apiMethod: "POST",
//                     apiParams: {
//                       reportType: 2,
//                       report: friend,
//                       block: true,
//                       leave: false,
//                     },
//                   },
//                   {
//                     key: "block",
//                     label: t("Block"),
//                     apiUrl: "/friend/block",
//                     apiMethod: "POST",
//                     apiParams: {
//                       user: friend,
//                     },
//                   },
//                 ],
//                 cancel: t("Cancel"),
//               },
//               unblockDialog: {
//                 apiUrl: "/friend/unblock",
//                 label: t("Unblock"),
//                 apiMethod: "POST",
//                 apiParams: {
//                   user: friend,
//                 },
//               },
//             },
//             {
//               key: "report",
//               label: t(`Report ${response.data[0].name} ?`),
//               description: t(
//                 "Here, you can report this user. You can also choose to report and block below."
//               ),
//               buttons: [
//                 {
//                   label: t("Report and Block"),
//                   apiUrl: "/user/report",
//                   apiMethod: "POST",
//                   apiParams: {
//                     reportType: REPORT_TYPE.user,
//                     report: friend,
//                     block: true,
//                     leave: false,
//                   },
//                 },
//                 {
//                   label: t("Report"),
//                   apiUrl: "/user/report",
//                   apiMethod: "POST",
//                   apiParams: {
//                     reportType: REPORT_TYPE.user,
//                     report: friend,
//                     block: false,
//                     leave: false,
//                   },
//                 },
//               ],
//               cancel: t("Cancel"),
//             },
//           ],
//         };
//         res.status(STATUS_CODE.success).json({ success: true, menu });
//       }
//       default: {
//         return res
//           .status(STATUS_CODE.bad_request)
//           .json({ success: false, message: "choose valid option type" });
//       }
//     }

//     res.status(STATUS_CODE.success).json({ success: true, options: [] });
//   } catch (error) {
//     next(error);
//   }
// };

export const getPermissions = async (req, res, next) => {
  try {
    const user = req.user;
    const response = await getRole({ roleId: user.role });
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json(response.data.permissions.map((permission) => permission.key));
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const generalSettings = async (req, res, next) => {
  try {
    const { error } = getGeneralSettingSchema(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const response = await getGeneralSetting({ key: req.query.key });
    if (response.success) {
      if (req.query.key === GENERAL_SETTING_KEY.group) {
        response.data.group.enabled = fs.existsSync(modulesDir + "/group") && response.data.group.enabled
      }
      return res.status(STATUS_CODE.success).json(response.data)
    };
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};
