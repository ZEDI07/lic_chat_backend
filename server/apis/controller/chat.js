import mongoose from "mongoose";
import SocketConnection from "../../../socket.js";
import { CONTENT_TYPE, MUTE_DURATION, SOCKET_EVENTS, STATUS_CODE, USER_STATUS } from "../../config/constant.js";
import * as chatServices from "../../models/chat.js";
import * as services from "../../models/message.js";
import { getReactions } from "../../models/reaction.js";
import { getAllStickerPack, getStickerCategory, getStickers } from "../../models/sticker.js";
import { userInfo, users } from "../../models/user.js";
import { catagoriesAndThereWallpaper, getChatWallpaper } from "../../models/wallpaper.js";
import { handleMessageSeen } from "../../utils/socketHelper.js";
import { chatWallpaperValidation, wallpaperValidation } from "../../validation/chat.js";
import * as validate from "../../validation/message.js";

export const stickers = async (req, res, next) => {
  try {
    const [categoryResponse, packResponse] = await Promise.all([
      getStickerCategory(),
      getAllStickerPack(),
    ]);
    if (!categoryResponse.success || !packResponse.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Unable to get Sticker and Category." });
    const category = categoryResponse.data.map((data) => ({
      name: data.name,
      color: data.color,
      image: data.url,
      apiUrl: `/chat/stickers/category/${data._id}`,
      apiMethod: "GET",
    }));
    const pack = packResponse.data.map((data) => ({
      name: data.name,
      image: data.url,
      description: data.description,
      apiUrl: `/chat/stickers/pack/${data._id}`,
      apiMethod: "GET",
    }));
    return res.status(STATUS_CODE.success).json({ category, pack });
  } catch (error) {
    next(error);
  }
};

export const categoryStickers = async (req, res, next) => {
  try {
    const { error } = categoryIdValidation({
      categoryId: req.params.categoryId,
    });
    if (error)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, error: error.message });

    const response = await getStickers(
      { category: req.params.categoryId },
      {},
      { url: 1 }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    response.data = response.data.map((data) => ({
      ...data,
      apiUrl: `/messsage/`,
      apiMethod: "POST",
      apiParams: {
        contentType: "form",
        type: "sticker",
        user: " ",
        sticker: data._id,
      },
    }));
    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const packStickers = async (req, res, next) => {
  try {
    const { error } = packIdValidation({ packId: req.params.packId });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    const response = await getStickers(
      { pack: req.params.packId },
      {},
      { url: 1 }
    );
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    response.data = response.data.map((data) => ({
      ...data,
      apiUrl: `/messsage/`,
      apiMethod: "POST",
      apiParams: {
        contentType: "form",
        type: "sticker",
        user: " ",
        sticker: data._id,
      },
    }));
    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const reactions = async (req, res, next) => {
  try {
    const response = await getReactions({}, { name: 1, url: 1 });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: response.message });
    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const chats = async (req, res, next) => {
  try {
    const limit = +req.query.limit || 15;
    if (limit < 10)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "minimum limit should be 10" });
    const search = req.query.search;
    const archive = req.query?.archive == "true" ? true : false;
    const unread = req.query?.unread == "true" ? true : false;
    const lastMessage = req.query.lastMessage;
    const chats = await chatServices.chats({ user: req.user._id, limit: limit + 1, lastMessage, archive });
    let more = false;
    if (chats.length == limit + 1) {
      chats.pop();
      more = true;
    }
    return res.status(STATUS_CODE.success).json({
      chats: chats,
      more,
    })
  } catch (error) {
    console.log("error >>", error);
    next(error);
  }
};

export const unreadChats = async (req, res, next) => {
  try {
    // const response = await friendServices.unReadChats({ user: req.user._id });
    const unreadCount = await chatServices.chatCount({
      user: req.user._id,
      archive: false,
      $or: [
        { unread: { $ne: 0 } },
        { markUnread: true }
      ]
    })
    return res.status(STATUS_CODE.success).json({
      unreads: unreadCount,
    });
  } catch (error) {
    console.log("error >>", error);
    next(error);
  }
};

export const deleteChats = async (req, res, next) => {
  try {
    const { error } = validate.deleteConversation(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    let chats = [];
    for (let converstion of req.body) {
      chats.push(converstion.chat);
      services
        .deleteConversation({
          user: req.user._id,
          chat: converstion.chat,
          receiverType: converstion.chatType,
        })
        .then((res) => console.log("Response >", res));
    }
    SocketConnection.emitSocketEvent(
      `user_${req.user._id}`,
      SOCKET_EVENTS.chat_deleted,
      {
        chats: chats,
      }
    );
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Chat Deleted Successfully" });
  } catch (error) {
    next(error);
  }
};

export const pin = async (req, res, next) => {
  try {
    const { error } = validate.validateId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chat = req.body.chat;
    const user = req.user._id;
    // const response = await chatServices.pin({ user, chat });
    const response = await chatServices.updateChatInfo({ chat: chat, user: user, status: USER_STATUS.active }, { pin: Date.now() })
    if (response) {
      SocketConnection.emitSocketEvent(
        `user_${req.user._id}`,
        SOCKET_EVENTS.chat_pin,
        {
          chat: chat,
          updatedAt: response.pin,
          status: true,
        }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Pinned" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const unpin = async (req, res, next) => {
  try {
    const { error } = validate.validateId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chat = req.body.chat;
    const user = req.user._id;
    const response = await chatServices.updateChatInfo({ chat: chat, user: user, status: USER_STATUS.active }, { pin: null })
    if (response) {
      SocketConnection.emitSocketEvent(
        `user_${req.user._id}`,
        SOCKET_EVENTS.chat_pin,
        {
          chat: chat,
          updatedAt: response.pin,
          status: false,
        }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Chat unpinned successfully" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const newChats = async (req, res, next) => {
  const search = req.query.search;
  try {
    const response = await users({
      user: req.user._id,
      search
    })
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json({ message: response.message })
    return res.status(STATUS_CODE.success).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const mute = async (req, res, next) => {
  try {
    const { error } = validate.validateMutePayload(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const user = req.user._id;
    const { chat: chats, duration } = req.body;
    const chatIds = (await chatServices.findChats({ chat: { $in: chats }, user: user, status: USER_STATUS.active, mute: false })).map(chat => chat.chat);
    console.log("validate chats", chatIds)
    const now = new Date();
    let targetTime;
    // let promises = [];
    switch (duration) {
      case MUTE_DURATION.eight:
        targetTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); //for 8 hours  //new Date(now.getTime() + 1 * 60 * 1000); 1min
        break;
      case MUTE_DURATION.week:
        targetTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // for 1 week
        break;
      default:
        targetTime = null;
    }
    await chatServices.updateChatsInfo({ chat: { $in: chatIds }, user: user, status: USER_STATUS.active }, { mute: true, muteTill: targetTime });
    const data = {
      chats: chatIds,
    };
    SocketConnection.emitSocketEvent(
      [`user_${req.user._id}`],
      SOCKET_EVENTS.chat_mute,
      { ...data, status: true }
    );
    return res.status(STATUS_CODE.success).json({
      success: true,
      message: "Successfully conversation muted !!",
      data,
    });
    // chats.forEach(async (chat) => {
    //   promises.push(
    //     await chatServices.mute({
    //       user,
    //       chat,
    //       endTime: targetTime ? targetTime : null,
    //     })
    //   );
    // });

    // Promise.all(promises)
    //   .then(() => {
    //     const data = {
    //       chats: chats,
    //     };
    //     SocketConnection.emitSocketEvent(
    //       [`user_${req.user._id}`],
    //       SOCKET_EVENTS.chat_mute,
    //       { ...data, status: true }
    //     );
    //     return res.status(STATUS_CODE.success).json({
    //       success: true,
    //       message: "Successfully conversation muted !!",
    //       data,
    //     });
    //   })
    //   .catch((error) => {
    //     return res
    //       .status(STATUS_CODE.bad_request)
    //       .json({ success: true, message: error.message });
    //   });
  } catch (error) {
    next(error);
  }
};

export const unmute = async (req, res, next) => {
  try {
    const { error } = validate.validateChatId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chat = req.body.chat;
    const user = req.user._id;
    const response = await chatServices.updateChatInfo({ user, chat, status: USER_STATUS.active, mute: true }, { mute: false, muteTill: null });
    if (response) {
      const data = {
        chats: chat,
      };
      SocketConnection.emitSocketEvent(
        [`user_${req.user._id}`],
        SOCKET_EVENTS.chat_mute,
        { ...data, status: false }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "removed from mute", data });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const archiveCount = async (req, res, next) => {
  try {
    const count = await chatServices.chatCount({ user: req.user._id, archive: true });
    return res.status(STATUS_CODE.success).json({ count });
  } catch (error) {
    next(error);
  }
};

export const archive = async (req, res, next) => {
  try {
    const { error } = validate.validateChatId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chats = req.body.chat;
    const user = req.user._id;
    console.log("chats body", chats)
    const chatIds = (await chatServices.findChats({ chat: { $in: chats }, user: user, status: USER_STATUS.active, archive: false })).map(chat => chat.chat);
    console.log("chat ids", chatIds)
    const response = await chatServices.updateChatsInfo({ chat: { $in: chatIds }, user: user, status: USER_STATUS.active, archive: false }, { archive: true, pin: null })
    console.log("update response", response)
    // const response = await chatServices.archive({ user, chats, archive: true });
    if (response) {
      const data = {
        chats: chatIds,
      };
      SocketConnection.emitSocketEvent(
        `user_${user}`,
        SOCKET_EVENTS.chat_archived,
        { ...data, status: true }
      );
      // chats.forEach(async (chat) => {
      //   const unpinRes = await chatServices.unpin({ user, chat });
      //   if (unpinRes.success) {
      //     SocketConnection.emitSocketEvent(
      //       `user_${req.user._id}`,
      //       SOCKET_EVENTS.chat_pin,
      //       {
      //         chat: unpinRes.data.chat,
      //         updatedAt: unpinRes.data.updatedAt,
      //         status: false,
      //       }
      //     );
      //   }
      // });
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "added to archive", data });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const unarchive = async (req, res, next) => {
  try {
    const { error } = validate.validateChatId(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chats = req.body.chat;
    const user = req.user._id;
    // const response = await chatServices.archive({ user, chats, archive: false });
    const chatIds = (await chatServices.findChats({ chat: { $in: chats }, user: user, status: USER_STATUS.active, archive: true })).map(chat => chat.chat);
    const response = await chatServices.updateChatsInfo({ chat: { $in: chatIds }, user: user, status: USER_STATUS.active, archive: true }, { archive: false })
    if (response) {
      SocketConnection.emitSocketEvent(
        `user_${user}`,
        SOCKET_EVENTS.chat_archived,
        {
          chats: chatIds,
          status: false,
        }
      );
      return res
        .status(STATUS_CODE.success)
        .json({ message: "removed from archive" });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "unable to unarchive." });
  } catch (error) {
    next(error);
  }
};

export const markUnread = async (req, res, next) => {
  try {
    const { error } = validate.deleteConversation(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chats = req.body.map((ele) => ele.chat);
    await chatServices.updateChatsInfo({ chat: { $in: chats }, user: req.user._id, status: USER_STATUS.active, unread: 0 }, { markUnread: true, unread: 0 });
    SocketConnection.emitSocketEvent(
      [`user_${req.user._id}`],
      SOCKET_EVENTS.chat_unread,
      { chats: chats }
    );
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "marked unread" });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const { error } = validate.deleteConversation(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const chatIds = [];
    for (let chats of req.body) {
      chatIds.push(chats.chat);
      await handleMessageSeen(
        { chat: chats.chat, receiverType: chats.chatType },
        req.user._id
      );
    }
    await chatServices.updateChatsInfo({
      chat: { $in: chatIds }, user: req.user._id, status: USER_STATUS.active, $or: [{ unread: { $ne: 0 } }, { markUnread: true }]
    }, { markUnread: false, unread: 0 });
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "marked readed" });
  } catch (error) {
    next(error);
  }
};

export const search = async (req, res, next) => {
  try {
    const user = req.user._id;
    const media = req.query.media;
    const text = req.query.text;
    const lastMessage = req.query.lastMessage;
    const lastChat = +req.query.lastChat || 0;
    const limit = +req.query.limit || 15;
    const more = req.query.more;
    const { error } = validate.chatSearchValidation({
      media,
      text,
      more,
      lastMessage,
      lastChat,
    });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    if (media) {
      const response = await services.mediaMesssage({
        user: user,
        contentType: media == CONTENT_TYPE.link ? [CONTENT_TYPE.text] : [media],
        lastMessage: lastMessage,
        limit: limit + 1,
        search: text,
        userDetails: [CONTENT_TYPE.image, CONTENT_TYPE.video].includes(media)
          ? false
          : true,
        global: true,
      });
      if (!response.success)
        return res.status(STATUS_CODE.bad_request).json(response);
      let more = false;
      if (response.data.length == limit + 1) {
        response.data.pop();
        more = true;
      }
      return res.status(STATUS_CODE.success).json({
        chats: { data: [], more: false },
        messages: { data: response.data, more },
        starred: { data: [], more: false },
      });
    } else {
      let response = await chatServices.chatSearch({
        user: user,
        text,
        limit: limit + 1,
        lastChat,
        lastMessage,
        more,
      });
      if (!response.success)
        return res.status(STATUS_CODE.bad_request).json(response);
      const keys = Object.keys(response.data);
      const data = {};
      for (let key of keys) {
        let more = false;
        if (response.data[key].length == limit + 1) {
          response.data[key].pop();
          more = true;
        }
        data[key] = { data: response.data[key], more };
      }
      return res.status(STATUS_CODE.success).json(data);
    }
  } catch (error) {
    next(error);
  }
};

export const chatsById = async (req, res, next) => {
  try {
    let chat = req.params.chat;
    if (chat && !mongoose.isValidObjectId(chat)) {
      const userDetail = await userInfo({ uid: chat });
      if (!userDetail.success)
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: "Not valid uid" });
      chat = userDetail.data._id;
    }
    if (!chat) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Required chat id. " });
    }
    const response = await chatServices.chats({
      chat: chat,
      user: req.user._id,
    });
    if (response.length) return res.status(STATUS_CODE.success).json(response[0]);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "Chat details not found." });
  } catch (error) {
    next(error);
  }
};

export const getSoundWallpaper = async (req, res, next) => {
  try {
    const t = req.t;
    const chat = req.params.chat;
    const user = req.user._id;

    const { error } = wallpaperValidation({ id: chat });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Not a chat id" });

    const wallpaperForChat = await getChatWallpaper({ user, chat });
    return res
      .status(STATUS_CODE.success)
      .json({ data: wallpaperForChat.data });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getWallpaperThemes = async (req, res, next) => {
  try {
    let wallpaperThemes = await catagoriesAndThereWallpaper();
    if (!wallpaperThemes.success) {
      return res
        .status(STATUS_CODE.server_error)
        .json({ success: false, message: wallpaperThemes.message });
    }

    return res.status(STATUS_CODE.success).json({ data: wallpaperThemes.data });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getWallpaper = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { error } = wallpaperValidation({ id: id });
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    let wallpapersOfTheme = await catagoriesAndThereWallpaper({ id });
    if (!wallpapersOfTheme.success) {
      return res
        .status(STATUS_CODE.server_error)
        .json({ success: false, message: wallpapersOfTheme.message });
    }

    return res
      .status(STATUS_CODE.success)
      .json({ data: wallpapersOfTheme?.data[0]?.wallpapers });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const setWallpaper = async (req, res, next) => {
  try {
    const { chat, wallpaper } = req.body;

    const { error } = chatWallpaperValidation({ chat, wallpaper });
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }

    const user = req.user;
    await chatServices.updateManyChatWallpaper(
      { chat: chat, status: true },
      { $set: { status: false } },
      {}
    );

    const setChatWallpaper = await chatServices.updateChatWallpaper(
      { chat: chat, user: user._id, wallpaper: wallpaper },
      { $set: { status: true } },
      { new: true, upsert: true }
    );
    if (!setChatWallpaper.success)
      return res
        .status(STATUS_CODE.server_error)
        .json({ success: false, message: setChatWallpaper.message });

    const newWallpaper = await getChatWallpaper({ user: user._id, chat });

    SocketConnection.emitSocketEvent(
      [`user_${req.user._id}`],
      SOCKET_EVENTS.wallpaper_changed,
      newWallpaper.data
    );

    return res
      .status(STATUS_CODE.success)
      .json({ success: true, data: setChatWallpaper.data });
  } catch (error) {
    next(error);
  }
};
