import mongoose from "mongoose";
import SocketConnection from "../../socket.js";
import { CALL_MODE, CONTENT_TYPE, FRIENDSHIP_STATUS, MESSAGE_STATUS, MESSAGING_SETTING, RECEIVER_TYPE, SOCKET_EVENTS, USER_STATUS,MEMBER_GROUP_ROLE} from "../config/constant.js";
import { chatInfo, updateChatInfo } from "../models/chat.js";
import { addUserFriend } from "../models/friend.js";
import { getMessagingSetting } from "../models/generalSetting.js";
import { getGroupDetails, groupActiveMembersWithUserInfo, groupMembers } from "../models/group.js";
import { messageStatus } from "../models/message.js";
import messageModel from "../models/schema/message.js";
import messageDeletedModel from "../models/schema/messageDeleted.js";
import messageStatusModel from "../models/schema/messageStatus.js";
import { userInfo } from "../models/user.js";
import { sendNotification } from "../utils/pushNotification.js";
import { handleNewCall } from "./call.js";
import { handleLastMessage } from "./chat.js";

export const handleDeletedMessageEveryone = async (messageDetails) => {
  try {
    const io = SocketConnection.getSocketInstance();
    const receivers = await messageStatus({ message: messageDetails._id });
    console.log('receivers', receivers);
    if (!receivers.success) return;
    console.log("message details", messageDetails)
    //handling for sender
    updateChatInfo({
      chat: messageDetails.receiver,
      user: messageDetails.sender,
      receiverType: messageDetails.receiverType,
      "lastMessage._id": messageDetails._id
    },
      {
        "lastMessage.deleted": true
      })
    io.to(`user_${messageDetails.sender}`).emit(
      SOCKET_EVENTS.message_deleted_everyone,
      {
        message: messageDetails._id,
        chat: messageDetails.receiver,
        updatedAt: messageDetails.updatedAt,
        deletedBy: messageDetails.deletedBy,
      }
    );
    // handling for all receivers
    for (let user of receivers.data) {
      const chat = messageDetails.receiverType == RECEIVER_TYPE.group ? messageDetails.receiver : messageDetails.sender;
      updateChatInfo({
        chat: chat,
        user: user.user,
        receiverType: messageDetails.receiverType,
        "lastMessage._id": messageDetails._id
      },
        { "lastMessage.deleted": true })
      io.to(`user_${user.user}`).emit(
        SOCKET_EVENTS.message_deleted_everyone,
        {
          message: messageDetails._id,
          chat: chat,
          updatedAt: messageDetails.updatedAt,
          deletedBy: messageDetails.deletedBy,
        }
      );
    }



    // if (messageDetails.receiverType == RECEIVER_TYPE.group) {
    //   const groupDetails = await getGroupDetails(messageDetails.receiver);
    //   if (!groupDetails.success) {
    //     return;
    //   }
    //   for (let member of groupDetails.data.members) {
    //     //broadcasting to users one by one.
    //     io.to(`user_${member.user._id}`).emit(
    //       SOCKET_EVENTS.message_deleted_everyone,
    //       {
    //         message: messageDetails._id,
    //         chat: messageDetails.receiver,
    //         updatedAt: messageDetails.updatedAt,
    //         deletedBy: messageDetails.deletedBy,
    //       }
    //     );
    //   }
    // } else {
    //   io.to([`user_${messageDetails.sender}`]).emit(
    //     SOCKET_EVENTS.message_deleted_everyone,
    //     {
    //       message: messageDetails._id,
    //       chat: messageDetails.receiver,
    //       updatedAt: messageDetails.updatedAt,
    //       deletedBy: messageDetails.deletedBy,
    //     }
    //   );

    //   io.to([`user_${messageDetails.receiver}`]).emit(
    //     SOCKET_EVENTS.message_deleted_everyone,
    //     {
    //       message: messageDetails._id,
    //       chat: messageDetails.sender,
    //       updatedAt: messageDetails.updatedAt,
    //       deletedBy: messageDetails.deletedBy,
    //     }
    //   );
    // }
  } catch (error) {
    console.log("Error while handling deleted message from everyone.", error);
  }
};

export const handlePushNotification = async ({ devicetokens, chat, user, message, contents }) => {
  try {
    console.log("inside send notification", message)
    if (!devicetokens?.length) return;
    let notiConfig = {};
    if (message.contentType !== CONTENT_TYPE.text && message.media) {
      notiConfig.ios_attachments = { id1: message.media };
      notiConfig.big_picture = message.media;
    }
    // currently notification won't be send on mute
    if (chat.mute && (chat.muteTill > Date.now || !chat.muteTill)) return;
    const isCall = [CONTENT_TYPE.audioCall, CONTENT_TYPE.videoCall].includes(message.contentType)
    sendNotification({
      deviceTokens: devicetokens,
      config: {
        ...notiConfig,
        headings: { en: chat.name },
        contents: { en: contents || message.text || message.contentType },
        data: {
          type: "CircuitChat",
          chat: {
            _id: String(chat._id),
            email: chat?.email,
            name: chat?.name,
            avatar: chat?.avatar,
            active: chat?.active,
            verified: chat?.verified,
            chatType: message.chatType,
            lastActive: chat?.lastActive,
            uid: chat?.uid,
          },
          call: isCall ? {
            status: message.status,
            channel: message._id,
            callMode: message.contentType,
            chatType: message.receiverType,
          } : undefined,
          mute: chat.mute && (chat.muteTill > Date.now || !chat.muteTill),
          archived: chat.archive,
        },
      },
      userid: user._id,
    });
  } catch (error) {
    console.log("error >>", error);
  }
};

export const handleNewMessage = async ({ rawMessage, message, receiver, reply, story, sender, agora }) => {
  try {
    const isCall = [CONTENT_TYPE.audioCall, CONTENT_TYPE.videoCall].includes(message.contentType);
    message = {
      ...message,
      user: {
        _id: sender._id,
        email: sender.email,
        name: sender.name,
        active: sender.active,
        lastActive: sender.lastActive,
        verified: sender.verified,
        avatar: sender.avatar,
      },
    };
    reply && (message.reply = reply);
    story && (message.story = story);
    // Handling Message for RECEIVER TYPE ++ USER
    if (message.receiverType == RECEIVER_TYPE.user) {
      if (message?.processed !== true) {
        messageStatusModel
          .create({
            message: message._id,
            user: message.receiver,
            status: MESSAGE_STATUS.sent,
          })
          .then(() => console.log("status stored.")).catch((error) => console.log("error while storing status", error));
      }
      const isBlock = receiver.blocked;
      if (isBlock || message?.unblocking) {
        //unblocking come when notification type message receive when unblocked other wise undefined
        messageDeletedModel
          .create({ message: message._id, user: message.receiver })
          .then(() => console.log("Blocked message Deleted"));
      }
      // Socket Event for Message Sender
      handleLastMessage({ chat: message.receiver, user: message.sender, message: rawMessage });
      if (isCall) {
        const callInfo = await handleNewCall({
          channel: rawMessage,
          chat: {
            _id: message.receiver,
            "email": receiver.email,
            "uid": receiver.uid,
            "name": receiver.name,
            "status": receiver.status,
            "active": receiver.active,
            "verified": receiver.verified,
            "avatar": receiver.avatar,
            "role": receiver.role,
            "link": receiver.link,
            "about": receiver.about,
            "lastActive": receiver.lastActive,
            "chatType": RECEIVER_TYPE.user,
            enableCalling: true
          }, user: message.sender, callMode: CALL_MODE.outgoing, agora, uid: sender.uid
        })
        if (callInfo) {
          message.call = callInfo;
        }
      }
      SocketConnection.emitSocketEvent(`user_${message.sender}`, SOCKET_EVENTS.new_message, message);
      if (
        !message?.unblocking &&
        !isBlock &&
        String(message.sender) !== String(message.receiver)
      ) {
        const receiverDetails = await userInfo({ _id: message.receiver });
        if (message.contentType !== CONTENT_TYPE.notification) {
          handlePushNotification({
            devicetokens: receiver.deviceTokens,
            chat: sender,
            user: receiverDetails.data,
            message,
            contents:
              receiverDetails.success && message?.processed == true
                ? "Video Processed"
                : undefined,
          });
        }
        handleLastMessage({ chat: message.sender, user: message.receiver, message: rawMessage })
        if (isCall) {
          const callInfo = await handleNewCall({
            channel: rawMessage,
            chat: {
              _id: message.sender,
              "email": sender.email,
              "uid": sender.uid,
              "name": sender.name,
              "status": sender.status,
              "active": sender.active,
              "verified": sender.verified,
              "avatar": sender.avatar,
              "role": sender.role,
              "link": sender.link,
              "about": sender.about,
              "lastActive": sender.lastActive,
              "chatType": RECEIVER_TYPE.user,
              enableCalling: true
            }, user: message.receiver, callMode: CALL_MODE.incoming, agora, uid: receiver.uid
          })
          if (callInfo) {
            message.call = callInfo;
          }
        }
        SocketConnection.emitSocketEvent(`user_${message.receiver}`, SOCKET_EVENTS.new_message, message);
      }
    } else if (message.receiverType == RECEIVER_TYPE.group) {
      // Handling Message for RECEIVER TYPE ++ GROUP
      // const writeOps = [];
      // const emitTo = [];
      if (reply) {
        let replyUser = receiver.members.find(member => String(member.user._id) == String(message.reply.sender));
        if (!replyUser) {
          const user = await userInfo(
            { _id: message.reply.sender },
            { avatar: 1, email: 1, verified: 1, active: 1, lastActive: 1 }
          );
          if (user.success) {
            message.reply.user = user.data;
          }
        } else
          message.reply.user = replyUser.user
      }
      const enableCalling = receiver.settings.member.call ? true : false;
      for (let member of receiver.members) {
        // emitTo.push(`user_${member.user._id}`);
        if (String(member.user._id) !== String(message.sender)) {
          if (message?.processed !== true) {
            messageStatusModel.create({
              message: message._id,
              user: member.user._id,
              status: MESSAGE_STATUS.sent,
            }).then(() => console.log("status stored.")).catch((error) => console.log("error while storing status", error));
          }
          // Sending notification to all group member except sender
          if (message.contentType !== CONTENT_TYPE.notification) {
            handlePushNotification({
              devicetokens: member.user.devicetokens,
              chat: receiver,
              user: member.user,
              message: message,
              contents: message?.processed == true
                ? "Video Processed"
                : undefined,
            });
          }
          if (isCall) {
            const callInfo = await handleNewCall({
              channel: rawMessage,
              chat: {
                _id: message.receiver,
                "name": receiver.name,
                "about": receiver.about,
                "status": receiver.status,
                "avatar": receiver.avatar,
                "link": receiver.link,
                "chatType": RECEIVER_TYPE.group,
              },
              user: member.user._id, callMode: CALL_MODE.incoming, agora, uid: member.user.uid
            })
            if (callInfo) {
              message.call = callInfo;
            }
          }
        } else if (isCall && String(member.user._id) == String(message.sender)) {
          const callInfo = await handleNewCall({
            channel: rawMessage,
            chat: {
              _id: message.receiver,
              "name": receiver.name,
              "about": receiver.about,
              "status": receiver.status,
              "avatar": receiver.avatar,
              "link": receiver.link,
              "chatType": RECEIVER_TYPE.group,
              enableCalling
            },
            user: member.user._id, callMode: CALL_MODE.outgoing, agora, uid: member.user.uid
          })
          if (callInfo) {
            message.call = callInfo;
          }
        }
        handleLastMessage({ chat: message.receiver, user: member.user._id, message: rawMessage });
        SocketConnection.emitSocketEvent(`user_${member.user._id}`, SOCKET_EVENTS.new_message, message)
      }
      // reply &&
      //   String(member.user._id) == String(message.reply.sender) &&
      //   (message.reply.user = member.user);
    }
    // if (reply && !message.reply.user) {
    //   const user = await userInfo(
    //     { _id: message.reply.sender },
    //     { avatar: 1, email: 1, verified: 1, active: 1, lastActive: 1 }
    //   );
    //   if (user.success) {
    //     message.reply.user = user.data;
    //   }
    // }
    // if (message?.processed !== true) {
    //   messageStatusModel
    //     .bulkWrite(writeOps)
    //     .then((response) => console.log("Status Stored")); // Storing messsage status
    // } else if (message?.processed == true) {
    /// Sending notification to all member of group
    // handlePushNotification({
    //   devicetokens: sender.devicetokens,
    //   chat: receiver,
    //   user: sender,
    //   message: message,
    //   contents: "Video Processed",
    // });
    // }
    // SocketConnection.emitSocketEvent(
    //   emitTo,
    //   SOCKET_EVENTS.new_message,
    //   message
    // );
    // }
    // }
    // ** Handling socket event for admin page.
    if (SocketConnection.socketRooms().has("admin")) {
      const aggregation = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(message._id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $lookup: {
            from:
              message.receiverType == RECEIVER_TYPE.user ? "users" : "groups",
            localField: "receiver",
            foreignField: "_id",
            as: "receiver",
          },
        },
        {
          $unwind: "$sender",
        },
        {
          $unwind: "$receiver",
        },
      ];
      message = (await messageModel.aggregate(aggregation))[0];
      SocketConnection.emitSocketEvent(
        "admin",
        SOCKET_EVENTS.new_message_admin,
        message
      );
    }
  } catch (error) {
    console.error("error", error);
  }
};

export const handleMessageUpdate = async ({ message }) => {
  if (message.receiverType == RECEIVER_TYPE.user) {
    SocketConnection.emitSocketEvent(`user_${message.sender}`, SOCKET_EVENTS.message_update, message);
    SocketConnection.emitSocketEvent(`user_${message.receiver}`, SOCKET_EVENTS.message_update, message);
  } else {
    const members = await groupMembers({ chat: new mongoose.Types.ObjectId(message.receiver), status: USER_STATUS.active });
    for (let member of members) {
      SocketConnection.emitSocketEvent(`user_${member._id}`, SOCKET_EVENTS.message_update, message)
    }
  };
}

export const handleDeletedMessage = (user, message) => {
  try {
    const io = SocketConnection.getSocketInstance();
    io.to(`user_${user}`).emit(SOCKET_EVENTS.message_deleted, message);
  } catch (error) {
    console.log("while deleting message", error);
  }
};

export const handleMessgeReaction = async (message, reaction) => {
  try {
    if (message.receiverType == RECEIVER_TYPE.user) {
      reaction["chat"] =
        reaction.user == `${message.sender}`
          ? message.receiver
          : message.sender;

      SocketConnection.emitSocketEvent(
        `user_${message.receiver}`,
        SOCKET_EVENTS.message_reaction,
        { ...reaction, chat: message.sender }
      );
      SocketConnection.emitSocketEvent(
        `user_${message.sender}`,
        SOCKET_EVENTS.message_reaction,
        { ...reaction, chat: message.receiver }
      );
    } else if (message.receiverType == RECEIVER_TYPE.group) {
      const groupInfo = await getGroupDetails(message.receiver);
      if (!groupInfo.success) return;
      reaction["chat"] = message.receiver;
      const emitTo = groupInfo.data.members.map(
        (member) => `user_${member.user._id}`
      );
      SocketConnection.emitSocketEvent(emitTo, SOCKET_EVENTS.message_reaction, {
        ...reaction,
        chat: message.receiver,
      });
    }
  } catch (error) {
    console.log("Error while handling message reaction >>", error);
  }
};

// export const emitActiveLocations = async (user) => {
//   try {
//     const allActiveLocations = await findMessages({
//       sender: user,
//       contentType: CONTENT_TYPE.location,
//       "location.status": LOCATION_STATUS.live,
//       "location.locationType": LOCATION_TYPE.live_location,
//       deleted: { $ne: true },
//     });
//     const transformedData = allActiveLocations?.data?.map((doc) => ({
//       message: doc._id,
//       receiverType: doc.receiverType,
//       chat: doc.receiver,
//       coordinates: doc.location.coordinates,
//       endTime: doc.location.endTime,
//     }));
//     if (allActiveLocations.success) {
//       SocketConnection.emitSocketEvent(
//         `user_${user}`,
//         SOCKET_EVENTS.get_active_locations,
//         transformedData
//       );
//       return allActiveLocations;
//     }
//     return allActiveLocations;
//   } catch (error) {
//     return { success: false, message: "error while getting active locations" };
//   }
// };

// export const messageDialogMaker = async ({ message, fromMe, key, t }) => {
//   if (
//     message?.contentType === CONTENT_TYPE.notification ||
//     (message?.contentType === "video" && message?.media?.length < 1)
//   )
//     return [];
//   const receiverType = message?.receiverType;
//   const isBlock = false;
//   let blockInfo = await friendDetails({
//     $or: [
//       {
//         sourceId: message.sender,
//         targetId: message.receiver,
//         status: FRIENDSHIP_STATUS.accepted,
//         messageblock: fromMe ? message.receiver : message.sender,
//       },
//       {
//         sourceId: message.receiver,
//         targetId: message.sender,
//         status: FRIENDSHIP_STATUS.accepted,
//         messageblock: fromMe ? message.receiver : message.sender,
//       },
//     ],
//   });
//   if (blockInfo.success) {
//     isBlock = true;
//   }

//   t ||= message?.t;
//   const dialog = {
//     star: t("Star"),
//     unstar: t("Unstar"),
//     forward: t("Forward"),
//     copy: t("Copy"),
//     reply: t("Reply"),
//     replyPrivately: t("Reply Privately"),
//     personalMessage: t(`Message ${message?.user?.name}`),
//     edit: t("Edit"),
//     delete: t("delete"),
//     report: t("Report"),
//     reportDialog: {
//       label: t(`Report ${message?.user?.name}?`),
//       description: t(
//         "This Message will be forwarded to Circuit Chat. This contact will not be notified."
//       ),
//       ...(!isBlock ? { reportBlock: t("Report and Block") } : {}),
//       report: t("Report"),
//     },
//     deleteDialog: {
//       label: t("Delete"),
//       labelAdd: t("Messages?"),
//       forMe: {
//         key: "forMe",
//         label: t("Delete For Me"),
//       },
//       forEveryOne: {
//         key: "forEveryOne",
//         label: t("Delete for Everyone"),
//       },
//     },
//   };
//   const enterDialog = {};
//   if (key === "message") {
//     const currentDate = new Date();
//     const createdAtDate = new Date(message?.createdAt);
//     let allowEdit = true;
//     if (createdAtDate < new Date(currentDate - 24 * 60 * 60 * 1000))
//       allowEdit = false;
//     !message.starred
//       ? (enterDialog["star"] = dialog["star"])
//       : (enterDialog["unstar"] = dialog["unstar"]);
//     enterDialog["reply"] = dialog["reply"];
//     message?.location?.locationType !== "live_location" &&
//       (enterDialog["forward"] = dialog["forward"]);
//     (message?.contentType == "text" ||
//       (message?.contentType == "image" && message?.text?.length > 0) ||
//       message?.contentType == "location") &&
//       message?.location?.locationType !== "live_location" &&
//       (enterDialog["copy"] = dialog["copy"]);

//     if (receiverType === RECEIVER_TYPE.group && !fromMe) {
//       enterDialog["replyPrivately"] = dialog["replyPrivately"];
//       enterDialog["personalMessage"] = dialog["personalMessage"];
//     }

//     // Allowing text to edit when text include media messages.
//     fromMe &&
//       allowEdit &&
//       message.text?.length &&
//       (enterDialog["edit"] = dialog["edit"]);

//     !fromMe && (enterDialog["report"] = dialog["report"]);
//     fromMe && delete enterDialog["reportDialog"];
//     enterDialog["delete"] = dialog["delete"];
//     enterDialog["deleteDialog"] = dialog["deleteDialog"];
//   }
//   key === "message_deleted" && (enterDialog["delete"] = dialog["delete"]);
//   return enterDialog;
// };

export const messageReceiver = async ({ chat, user, receiverType }) => {
  const receiver = await userInfo({ _id: chat, receiverType });
  if (!receiver.success) {
    return { success: false, message: "receiver is not found" };
  }
  if (!receiverType) {
    receiverType = receiver.data.receiverType
  }
  if (receiverType == RECEIVER_TYPE.group) {
    // const members = await findChats({ chat: chat, status: FRIENDSHIP_STATUS.accepted });
    const members = await groupActiveMembersWithUserInfo({ group: chat });
    const member = members.find(member => String(member.user._id) == String(user));
    if (!member)
      return {
        success: false,
        message: "You are not a member of this group.",
      };
    if (!receiver.data.settings.member.sendMessage && ![MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.superAdmin].includes(member.role)) {
      return {
        success: false,
        message: "Only admins can send message in this group",
      };
    }
    receiver.data = { ...receiver.data.toJSON(), members }
    // receiver.data.members = members;
  } else {
    const messagingSetting = await getMessagingSetting();
    let friendship = await chatInfo({ chat: chat, user: user, receiverType: RECEIVER_TYPE.user });
    if (messagingSetting == MESSAGING_SETTING.friends && (!friendship || friendship.status == FRIENDSHIP_STATUS.rejected || friendship.status == FRIENDSHIP_STATUS.pending)) {
      return { success: false, message: "You can only message to your friends" };
    } else if (messagingSetting == MESSAGING_SETTING.everyone && !friendship) {
      const createUnkown = await addUserFriend({ user: user, users: [chat], status: FRIENDSHIP_STATUS.unknown });
      if (!createUnkown.success)
        return res
          .status(STATUS_CODE.bad_request)
          .json({ success: false, message: "Error while creating unknown friends" });
      friendship = await chatInfo({ chat: chat, user: user });
    }
    receiver.data = { ...friendship.toJSON(), ...receiver.data.toJSON(), }
  }
  return receiver
}

