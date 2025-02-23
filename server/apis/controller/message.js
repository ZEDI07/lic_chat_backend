import bcrypt from "bcrypt";
import ogs from "open-graph-scraper";
import SocketConnection from "../../../socket.js";
import { CONTENT_TYPE, FILE_TYPE, GROUP_TYPE, LOCATION_STATUS, LOCATION_TYPE, MESSAGE_STATUS, RECEIVER_TYPE, SOCKET_EVENTS, STATUS_CODE, USER_STATUS } from "../../config/constant.js";
import { handleMessgeReaction, handleNewMessage, messageReceiver } from "../../helpers/message.js";
import messageQueue from "../../helpers/queueMessage.js";
import { addFile } from "../../models/filemanager.js";
import { getGroupDetails } from "../../models/group.js";
import * as services from "../../models/message.js";
import { addPoll, findPoll, pollDetails, updateManyVote, updateVote, } from "../../models/poll.js";
import { reactionInfo } from "../../models/reaction.js";
import { getStickers } from "../../models/sticker.js";
import { findStories } from "../../models/story.js";
import { userDetail, userInfo, usersDetail } from "../../models/user.js";
import { checkPermission } from "../../utils/checkPermission.js";
import { handleMessageReceived } from "../../utils/socketHelper.js";
import Storage from "../../utils/storage.js";
import * as validate from "../../validation/message.js";

export const send = async (req, res, next) => {
  try {
    const body = req.body;
    const { error } = validate.messagePayload(body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    // Checking File type ..
    if (req.file && body.type !== req.file.mimetype.split("/")[0]) {
      return res.status(STATUS_CODE.bad_request).json({
        message: "Message Type and File Content type doesn't matched",
      });
    }
    const receiver = await messageReceiver({ chat: body.to, user: req.user._id, receiverType: body.receiverType });
    // const receiver = await userInfo({ _id: body.to, receiverType: body.receiverType });
    if (!receiver.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: receiver.message });
    }
    let messageData = {
      sender: req.user._id,
      receiver: body.to,
      receiverType: body.receiverType,
      status: MESSAGE_STATUS.sent,
      contentType: body.type,
      mentions: body.mentions,
    };
    if (body.text) {
      body.text = body.text.trim();
    }
    if (body.story) {
      let storyDetails = await findStories({ _id: body.story });
      if (storyDetails.success) {
        storyDetails.data = storyDetails.data[0].toJSON();
        let sender = await userDetail({ _id: storyDetails.data.user }, {});

        if (storyDetails.data.media) {
          const mediaDetails = await services.urlMaker(storyDetails.data.media);
          mediaDetails.success &&
            (storyDetails.data.media = mediaDetails.data.media);
          mediaDetails.success &&
            (storyDetails.data.media = mediaDetails.data.mediaDetails);
        }
        storyDetails.data = {
          ...storyDetails.data,
          user: {
            name: sender?.data?.name,
            avatar: sender?.data?.avatar,
            _id: sender?.data?._id,
          },
        };

        messageData.story = storyDetails.data;
      } else {
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: "Story message doesn't exist" });
      }
    }
    if (body.reply) {
      const filter =
        body.receiverType == RECEIVER_TYPE.group
          ? {
            _id: body.reply,
            deleted: false,
            receiver: body.to,
          }
          : {
            _id: body.reply,
            deleted: false,
            $or: [
              {
                sender: req.user._id,
                receiver: body.to,
              },
              {
                sender: body.to,
                receiver: req.user._id,
              },
            ],
          };
      let replyMessage = await services.messageInfo(filter);
      if (replyMessage.success) {
        replyMessage.data = replyMessage.data.toJSON();
        const sender = await userDetail(
          { _id: replyMessage.data.sender },
          { name: 1, _id: 1, avatar: 1 }
        );
        if (sender.success)
          replyMessage.data = {
            ...replyMessage.data,
            user: sender.data,
          };

        if (replyMessage.data.media) {
          const mediaDetails = await services.urlMaker(replyMessage.data.media);
          mediaDetails.success &&
            (replyMessage.data.media = mediaDetails.data.media);
        }
        if (replyMessage.data.poll) {
          const pollDetails = await findPoll({
            _id: replyMessage.data.poll,
          });
          pollDetails.success && (replyMessage.data.poll = pollDetails.data);
        }

        messageData.reply = replyMessage.data;
      } else {
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: "Reply message doesn't exist" });
      }
    }
    switch (body.type) {
      case CONTENT_TYPE.text:
        messageData.text = body.text;
        const urlPattern =
          /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/[\w.-]*)*(\?.*)?$/i;
        const isLink = body.text.match(urlPattern);
        const link = isLink ? isLink[0] : "";
        if (link) {
          try {
            const { result, error } = await ogs({ url: link });
            if (!error) {
              messageData = {
                ...messageData,
                link: {
                  url: link,
                  title: result?.ogTitle,
                  description: result?.ogDescription,
                  image: result.ogImage?.[0]?.url,
                },
              };
            }
          } catch (error) {
            messageData = {
              ...messageData,
              link: {
                url: link,
              },
            };
          }

          // if (req?.files?.thumbnail && req?.files?.thumbnail[0]) {
          //   req.files.thumbnail[0].fileType = FILE_TYPE.media;
          //   const savedData = await Storage.uploadFile(req.files.thumbnail[0]);
          //   if (savedData.success) {
          //     const thumbnailDetails = await addFile(savedData.data);
          //     if (!thumbnailDetails.success) {
          //       return res
          //         .status(STATUS_CODE.bad_request)
          //         .json({ message: thumbnailDetails.message });
          //     }

          //     messageData = {
          //       ...messageData,
          //       link: {
          //         ...body.link,
          //         thumbnail: thumbnailDetails.data._id,
          //         thumbnailUrl: savedData.data.media,
          //       },
          //     };
          //   } else {
          //     return res
          //       .status(STATUS_CODE.bad_request)
          //       .json({ message: savedData.message });
          //   }
          // } else {
          //   messageData = {
          //     ...messageData,
          //     link: { ...body.link },
          //   };
          // }
        }
        break;
      // case CONTENT_TYPE.gif:
      case CONTENT_TYPE.sticker:
        const isSticker = await getStickers({ id: body.sticker });
        if (!isSticker.success) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: "invalid sticker" });
        }
        messageData.media = isSticker.data[0].media;
        break;

      // to create poll
      case CONTENT_TYPE.poll: {
        const checkPermissionRole = "share_poll";
        const permission = await checkPermission(req, checkPermissionRole);
        if (!permission) {
          // fs.rmSync(req.file.path);
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: `Required Permission ${checkPermissionRole} ` });
        }
        const createdPoll = await addPoll(body.poll);
        if (createdPoll.success) {
          messageData["poll"] = createdPoll.data._id;
          messageData["pollData"] = createdPoll.data;
        }
        break;
      }
      case CONTENT_TYPE.audio:
      case CONTENT_TYPE.video:
      case CONTENT_TYPE.image:
      case CONTENT_TYPE.application:
        if (!req.files.file[0]) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: "Required File." });
        }
        const permissionsToCheck = {
          application: "share_document",
          audio: "record_and_send_audio",
          image: "share_photos_and_videos",
          video: "share_photos_and_videos",
        };

        const permission = await checkPermission(
          req,
          permissionsToCheck[`${body.type}`]
        );
        if (!permission) {
          return res.status(STATUS_CODE.bad_request).json({
            message: `Required Permission ${body.type}`,
          });
        }
        req.files.file[0].fileType = FILE_TYPE.media;
        const savedData = await Storage.uploadFile(req.files.file[0]);
        if (savedData.success) {
          const fileDetails = await addFile(savedData.data);
          if (!fileDetails.success) {
            return res
              .status(STATUS_CODE.bad_request)
              .json({ message: fileDetails.message });
          }
          messageData = {
            ...messageData,
            media: fileDetails.data._id,
            text: body.text,
            mediaUrl: savedData.data.processed ? savedData?.data?.media : "",
            file: savedData.data,
            mediaDetails: {
              originalname: savedData.data.originalname,
              mimetype: savedData.data.mimetype,
              mediaSize: savedData.data.size,
            },
          };
        } else {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: savedData.message });
        }
        break;
      case CONTENT_TYPE.location: {
        const checkPermissionRole = "share_location";
        const permission = await checkPermission(req, checkPermissionRole);
        if (!permission) {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: `Required Permission ${checkPermissionRole} ` });
        }
        if (body.location.live == "true" || body.location.live == true) {
          const date = new Date();
          let milliseconds = date.getTime();
          if (!body.location.duration) {
            return res.status(STATUS_CODE.bad_request).json({
              success: false,
              message: "Duration not mentioned in body",
            });
          }
          switch (body.location.duration) {
            case 15:
              milliseconds += 15 * 60 * 1000;
              break;
            case 1:
              milliseconds += 1 * 60 * 60 * 1000;
              break;
            case 8:
              milliseconds += 8 * 60 * 60 * 1000;
              break;
            default:
              milliseconds += 15 * 60 * 1000;
          }
          date.setTime(milliseconds);
          body.location.endTime = date;
          body.location.ended = false;
        }
        messageData = { ...messageData, ...body.location };
        messageData.location = {
          type: "Point",
          coordinates: body.location.coordinates
        }
        if (body.text) messageData.text = body.text;
        break;
      }
      case CONTENT_TYPE.contact:
        messageData.contact = body.contact;
        break;
      default:
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: "Invalid Message Type" });
    }
    const message = await services.createMessage({
      ...messageData,
      mentions: messageData?.mentions?.map((mention) => mention._id),
    });

    if (message.success) {
      handleNewMessage({
        rawMessage: message.data,
        message: {
          ...message.data.toJSON(),
          mentions: messageData.mentions,
          ...(messageData.poll ? { poll: messageData.pollData } : {}),
          ...(messageData.file
            ? {
              media: messageData.mediaUrl,
              mediaDetails: messageData.mediaDetails,
            }
            : {}),
          refId: req.body?.refId,
        },
        receiver: receiver.data,
        reply: messageData.reply,
        story: messageData.story,
        sender: req.user,
      });

      message.data.contentType == CONTENT_TYPE.video &&
        !messageData?.file?.processed &&
        messageQueue.enqueue({
          message: message.data,
          file: messageData.file,
          receiver: receiver.data,
          reply: messageData.reply,
          sender: req.user,
          t: req.t,
        });
      // message.data.type === CONTENT_TYPE.location &&
      // (await emitActiveLocations(req.user._id));
      return res
        .status(STATUS_CODE.success)
        .json({ ...message.data.toJSON(), refId: req.body?.refId, media: messageData?.mediaUrl, mediaDetails: messageData?.mediaDetails, });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json(message);
  } catch (error) {
    console.log("Error >>".error);
    next(error);
  }
};

export const messages = async (req, res, next) => {
  try {
    if (!Object.keys(RECEIVER_TYPE).includes(req.params.receiverType)) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "receiver type should be user or group" });
    }
    const search = req.query.search;
    const lastMessage = req.query.lastMessage;
    const limit = +req.query.limit || 15;
    const chat = req.params.chatId;
    const receiverType = req.params.receiverType;

    if (receiverType === RECEIVER_TYPE.group) {
      const groupData = await userInfo({ _id: chat, status: USER_STATUS.active });
      if (!groupData.success) {
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: groupData.message });
      }

      // // onlyAdmin = groupData?.data?.settings?.member?.sendMessage;
      // let members = [];
      // members = groupData?.data.members;
      // // groupDeleted = !groupData.data.status;
      // members?.map((item) => {
      //   if (item?.user?._id == req.user._id) {
      //     youAreAdmin =
      //       item.role ===
      //       (MEMBER_GROUP_ROLE.admin || MEMBER_GROUP_ROLE.superAdmin)(
      //         MEMBER_GROUP_ROLE.admin || MEMBER_GROUP_ROLE.superAdmin
      //       )
      //         ? true
      //         : false;
      //     youAreMember = true;
      //   }
      // });

      if (groupData.data.type == GROUP_TYPE.password_protected) {
        const password = req.body.password;
        if (!password)
          return res.status(STATUS_CODE.bad_request).json({
            success: false,
            message: "Required Password",
          });
        const match = await bcrypt.compare(password, groupData.data.password);
        if (!match) {
          return res
            .status(STATUS_CODE.unauthorized)
            .json({ message: "invalid Password" });
        }
      }
    }
    // const wallpaper = await getChatWallpaper({ user: req.user._id, chat });

    // const readReceiptRes = await settings(
    //   {
    //     $or: [
    //       { user: req.user._id, "privacy.readRecipts": true },
    //       { user: chat, "privacy.readRecipts": true },
    //     ],
    //   },
    //   { "privacy.readReceipts": 1 }
    // );
    // if (readReceiptRes.success) {
    //   readReceipt = true;
    // }

    // const blocked_me = await friendDetails({
    //   $or: [
    //     {
    //       sourceId: req.user._id,
    //       targetId: chat,
    //       status: FRIENDSHIP_STATUS.accepted,
    //       messageblock: req.user._id,
    //     },
    //     {
    //       sourceId: chat,
    //       targetId: req.user._id,
    //       status: FRIENDSHIP_STATUS.accepted,
    //       messageblock: req.user._id,
    //     },
    //   ],
    // });
    // const reactions = await getReactions({}, { name: 1, url: 1 });
    const response = await services.messages({
      user: req.user._id,
      chat: chat,
      receiverType: receiverType,
      search,
      lastMessage,
      limit: limit + 1,
    });
    let more = false;
    if (response.data?.length == limit + 1) {
      response.data.pop();
      more = true;
    }

    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json({
        message: response.message,
      });

    return res.status(STATUS_CODE.success).json({
      messages: response.data,
      more,
      // reactions: reactions.data,
      // wallpaper: wallpaper.data,
    });
  } catch (error) {
    next(error);
  }
};

// export const deleteDialog = async (req, res, next) => {
//   try {
//     const { messageId, fromMe } = req.params;
//     const t = req.t;
//     let everyoneDeleteButton = [];
//     fromMe == "true" &&
//       everyoneDeleteButton.push({
//         key: "submit",
//         label: t("Delete For Everyone"),
//         apiUrl: `/message/deleteEveryone`,
//         apiMethod: "POST",
//         apiParams: { messageId },
//       });
//     return res.status(STATUS_CODE.success).json({
//       confirmation: {
//         title: req.t("Delete Message"),
//         description: req.t("Are you sure want to delete message ?"),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Delete For Me"),
//             apiUrl: `/message/delete`,
//             apiMethod: "POST",
//             apiParams: { messageId },
//           },
//           ...everyoneDeleteButton,
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const deleteMe = async (req, res, next) => {
  try {
    const { error } = validate.validateMessageDeleteMe(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await services.deleteMessage(
      req.body.messages,
      req.user._id,
      req.body.chat
    );
    if (!response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ message: "Message Deleted Successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteEveryone = async (req, res, next) => {
  try {
    const { error } = validate.validateMessageId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await services.deleteMessageEveryone(
      {
        chat: req.body.chat,
        user: req.user._id,
        messages: req.body.messages
      }
    );
    if (!response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ message: "Message Deleted Successfully" });
  } catch (error) {
    next(error);
  }
};

// export const forwardDialog = async (req, res, next) => {
//   try {
//     const search = req.query.search;
//     const response = await forwardChatsGroups({
//       user: req.user._id,
//       search,
//     });

//     if (response.success) {
//       return res.status(STATUS_CODE.success).json({
//         data: response.data,
//       });
//     }
//     return res
//       .status(STATUS_CODE.bad_request)
//       .json({ success: false, message: response.message });
//   } catch (error) {
//     next(error);
//   }
// };

export const forward = async (req, res, next) => {
  try {
    const { error } = validate.forwardMessagePayload(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const { messages, users, text } = req.body;
    const fetchedUsers = {};
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      const { success, data } = await services.messageInfo({
        _id: message,
        deleted: false,
      });
      const mediaUrl = await services.urlMaker(data.media);
      const mentions = data.mentions?.length
        ? await usersDetail({ _id: { $in: data.mentions } }, { name: 1 })
        : undefined;
      if (!success) continue;
      for (let user of users) {
        //Checking in temp store user if not availabe get the details
        if (index == 0) {
          const receiver = await messageReceiver({ chat: user.to, user: req.user._id, receiverType: user.receiverType });
          fetchedUsers[user.to] = receiver;
        } else if (!fetchedUsers[user.to]) continue;
        if (success) {
          const messageData = {
            ...data.toJSON(),
            status: MESSAGE_STATUS.sent,
            sender: req.user._id,
            receiver: user.to,
            forward: true,
            receiverType: user.receiverType,
            message: data._id,

          };
          text && (messageData.text = text);

          // Deleting pre existing keys
          delete messageData["_id"];
          delete messageData["createdAt"];
          delete messageData["updatedAt"];

          const newMessage = await services.createMessage(messageData);
          if (newMessage.success) {
            handleNewMessage({
              rawMessage: newMessage.data,
              message: {
                ...newMessage.data.toJSON(),
                media: mediaUrl.success ? mediaUrl.data.media : undefined,
                mediaDetails: mediaUrl.success
                  ? mediaUrl.data.mediaDetails
                  : undefined,
                user: req.user,
                mentions: mentions && mentions.success && mentions.data,
              },
              receiver: fetchedUsers[user.to].data,
              sender: req.user,
            });
          }
        }
      }
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "message forwarded" });
  } catch (error) {
    next(error);
  }
};

export const edit = async (req, res, next) => {
  try {
    const { error } = validate.editMessagePayload(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const response = await services.updateMessage(
      {
        _id: req.body.messageID,
        sender: req.user._id,
        createdAt: { $gte: twentyFourHoursAgo },
      },
      { text: req.body.text, edited: true }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });
    if (response.success) {
      let message = {};
      message = response.data;

      if (message.reply) {
        let replyMessage = await services.messageInfo({ _id: message.reply });

        if (replyMessage.success) {
          let sender = await userDetail(
            { _id: replyMessage?.data?.sender },
            { name: 1, _id: 1, avatar: 1 }
          );
          let mediaUrl;
          if (replyMessage.data.media) {
            mediaUrl = await services.urlMaker(replyMessage.data.media);
          }
          replyMessage.data = {
            ...replyMessage.data._doc,

            user: {
              name: sender?.data?.name,
              avatar: sender?.data?.avatar,
              _id: sender?.data?._id,
            },
            media: mediaUrl?.data?.media,
          };
          message.reply = replyMessage.data;
        } else {
          return res
            .status(STATUS_CODE.bad_request)
            .json({ message: "Reply message doesn't exist" });
        }
      }
      message["t"] = req.t;
      message["req"] = req;
      if (message.receiverType === RECEIVER_TYPE.user) {
        let emitTo = [`user_${req.user._id}`];

        SocketConnection.emitSocketEvent(
          emitTo,
          SOCKET_EVENTS.message_edited,
          message
        );
        emitTo = [`user_${message.receiver}`];

        SocketConnection.emitSocketEvent(
          emitTo,
          SOCKET_EVENTS.message_edited,
          message
        );
      } else {
        let emitTo = [`user_${req.user._id}`];

        SocketConnection.emitSocketEvent(
          emitTo,
          SOCKET_EVENTS.message_edited,
          message
        );
        emitTo = [];
        const group = await getGroupDetails(message.receiver);
        group.data.members.forEach((member) => {
          emitTo.push(`user_${member._id}`);
        });

        SocketConnection.emitSocketEvent(
          emitTo,
          SOCKET_EVENTS.message_edited,
          message
        );
      }

      return res
        .status(STATUS_CODE.success)
        .json({ success: true, data: message, message: "edited" });
    }
  } catch (error) {
    next(error);
  }
};

export const media = async (req, res, next) => {
  try {
    const user = req.user._id;
    const chat = req.params.chat;
    const chatType = req.params.chatType;
    const mediaType = req.params.MediaType;
    const lastMessage = req.query.lastMessage;
    const limit = +req.query.limit || 10;
    const mediaTypes = ["media", "doc", "link"];
    if (!mediaTypes.includes(mediaType))
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Type should be " + String(mediaTypes) });
    if (!Object.values(RECEIVER_TYPE).includes(chatType))
      return res.status(STATUS_CODE.bad_request).json({
        message: "Chat type should be " + String(Object.values(RECEIVER_TYPE)),
      });

    let contentType;
    switch (mediaType) {
      case "media":
        contentType = [CONTENT_TYPE.video, CONTENT_TYPE.image];
        break;
      case "doc":
        contentType = [CONTENT_TYPE.application];
        break;
      case "link":
        contentType = [CONTENT_TYPE.text];
    }
    const response = await services.mediaMesssage({
      user,
      chat: chat,
      chatType,
      contentType: contentType,
      lastMessage,
      limit: limit + 1,
    });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });

    let more = false;
    if (response.data.length == limit + 1) {
      response.data.pop();
      more = true;
    }

    return res.status(STATUS_CODE.success).json({ data: response.data, more });
  } catch (error) {
    next(error);
  }
};

export const messageInfo = async (req, res, next) => {
  try {
    const response = await services.messageStatusInfo({
      message: req.params.messageId,
      user: req.user._id,
    });

    if (response.success)
      return res.status(STATUS_CODE.success).json({ data: response.data });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const starredMessages = async (req, res, next) => {
  try {
    if (!Object.keys(RECEIVER_TYPE).includes(req.params.chatType)) {
      return res.status(STATUS_CODE.bad_request).json({
        success: false,
        message: "receiver type should be user or group",
      });
    }
    const page = +req.query.page - 1 || 0;
    const limit = +req.query.limit || 15;

    const response = await services.starredMessages({
      user: req.user._id,
      chat: req.params.chat,
      receiverType: req.params.chatType,
      skip: page * limit,
      limit,
    });

    if (response.success)
      return res.status(STATUS_CODE.success).json({ data: response.data });

    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: response.message });
  } catch (error) {
    next(error);
  }
};

export const starred = async (req, res, next) => {
  try {
    const { error } = validate.validateStarMessageId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await services.messageStarred({
      user: req.user._id,
      messages: req.body.messages,
    });
    if (response.success) {
      SocketConnection.emitSocketEvent(
        `user_${req.user._id}`,
        SOCKET_EVENTS.message_starred,
        { messages: req.body.messages, chat: req.body.chat, status: true }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Message Starred" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const unstarred = async (req, res, next) => {
  try {
    const { error } = validate.validateStarMessageId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await services.messageUnStarred({
      user: req.user._id,
      messages: req.body.messages,
    });
    if (response.success) {
      SocketConnection.emitSocketEvent(
        `user_${req.user._id}`,
        SOCKET_EVENTS.message_starred,
        {
          messages: req.body.messages,
          chat: req.body.chat,
          status: false,
        }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Message Unstarred" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const addReaction = async (req, res, next) => {
  try {
    const { error } = validate.reactionPayload(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const { message, reaction } = req.body;
    const user = req.user;
    const messageinfo = await services.messageInfo({
      _id: message,
      deleted: false,
    });
    if (!messageinfo.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "invalid message" });
    const reactionDetails = await reactionInfo({ _id: reaction, status: true });
    if (!reactionDetails.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: reactionDetails.message });
    const response = await services.reaction({
      message,
      reaction,
      user: req.user._id,
    });
    if (!response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    }
    handleMessgeReaction(messageinfo.data, {
      ...response.data.toJSON(),
      user: user._id,
    });
    return res.status(STATUS_CODE.success).json({ message: "Reaction added." });
  } catch (error) {
    next(error);
  }
};

export const removeReaction = async (req, res, next) => {
  try {
    const { error } = validate.removeReactionPayload(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const messageDetail = await services.messageInfo({
      _id: req.body.message,
      deleted: false,
    });
    const user = req.user;
    if (!messageDetail.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "invalid message" });
    const response = await services.removeReaction({
      message: req.body.message,
      user: req.user._id,
    });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    handleMessgeReaction(messageDetail.data, {
      ...response.data.toJSON(),
      user: { _id: user._id, name: user.name, avatar: user.avatar },
    });
    return res
      .status(STATUS_CODE.success)
      .json({ messaeg: "Remove successfully." });
  } catch (error) {
    next(error);
  }
};

export const searchMessage = async (req, res, next) => {
  const text = req.params.text;
  const type = req.params.type;
  const user = req.user._id;
  if (!text) text = "";
  try {
    const { error } = validate.searchValid({ type });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.searchMessages({ user, type, text });
    if (!response)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });

    return res.status(STATUS_CODE.success).json({
      data: response?.data[0]?.mergedResult || [],
    });
  } catch (error) {
    next(error);
  }
};

export const stopLiveLocation = async (req, res, next) => {
  try {
    const { error } = validate.stopLiveLocationPayload(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { messages } = req.body;
    messages.forEach(async (message) => {
      await services.updateMessage(
        {
          _id: message,
        },
        {
          contentType: CONTENT_TYPE.location,
          "location.status": LOCATION_STATUS.ended,
        }
      );
    });

    return res.status(STATUS_CODE.success).json({
      success: true,
      message: "location ended",
    });
  } catch (error) {
    next(error);
  }
};

export const messageReceived = async (req, res, next) => {
  try {
    const { error } = validate.validateMessage(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const user = req.user._id;
    const message = req.body.message;

    handleMessageReceived(message, user);

    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "ok" });
  } catch (error) {
    next(error);
  }
};

export const pollVote = async (req, res, next) => {
  try {
    const { error } = validate.validateVote(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const { poll, option, message, status } = req.body;
    const user = req.user._id;

    const isAllowed = await findPoll({
      _id: poll,
      multiple: true,
    });
    if (!isAllowed.success) {
      updateManyVote(
        {
          user: user,
          message: message,
          status: true,
        },
        { status: false }
      );
    }
    const response = await updateVote(
      {
        user: user,
        option: option,
        message: message,
        $or: [{ status: status }, { status: !status }],
      },
      {
        status: status,
      },
      {
        upsert: true,
      }
    );
    if (!response.success) {
      return res
        .status(STATUS_CODE.success)
        .json({ success: false, message: response.message });
    }

    const pollDetail = await pollDetails(poll);
    const messageData = await services.messageInfo({ _id: message });
    const menu = { _id: message, poll: pollDetail.data };
    if (messageData?.data?.receiverType == RECEIVER_TYPE.group) {
      const response = await getGroupDetails(messageData.data.receiver);
      if (!response.success) return;
      for (let member of response.data?.members) {
        SocketConnection.emitSocketEvent(
          `user_${member}`,
          SOCKET_EVENTS.poll_update,
          menu
        );
      }
    } else if (messageData?.data?.receiverType == RECEIVER_TYPE.user) {
      const emitTo = [`user_${messageData.data.receiver}`, `user_${user}`];
      SocketConnection.emitSocketEvent(emitTo, SOCKET_EVENTS.poll_update, menu);
    }
    return res.status(STATUS_CODE.success).json({
      success: true,
      message: "ok",
      data: { _id: message, poll: pollDetail.data },
    });
  } catch (error) {
    next(error);
  }
};

export const getPoll = async (req, res, next) => {
  const poll = req.params.poll;
  const t = req.t;
  try {
    const { error } = validate.validatePoll({ poll });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const pollDetail = await pollDetails(poll);
    if (!pollDetail.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: pollDetail.message });
    }

    return res.status(STATUS_CODE.success).json({ data: pollDetail.data });
  } catch (error) {
    next(error);
  }
};
