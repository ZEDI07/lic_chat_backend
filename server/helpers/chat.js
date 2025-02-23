import SocketConnection from "../../socket.js";
import { CONTENT_TYPE, MESSAGE_STATUS, NOTIFICATION_ACTION, RECEIVER_TYPE, SOCKET_EVENTS, currDir } from "../config/constant.js";
import { createMessage } from "../models/message.js";
import ChatModel from "../models/schema/chat.js";
import { handleNewMessage } from "./message.js";

export const alphaConverter = (array, t) => {
  const groupedResults = {};
  const sortedArray = array?.sort((a, b) => a?.name?.localeCompare(b?.name));
  sortedArray?.length > 0 &&
    sortedArray[0]?.name &&
    sortedArray?.forEach((item) => {
      const firstLetter = item?.name[0]?.toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";

      if (!groupedResults[key]) {
        groupedResults[key] = {
          title: t(key),
          results: [],
        };
      }

      groupedResults[key].results.push(item);
    });

  return groupedResults;
};

export const blockAvatarConverter = async ({ user, friends }) => {
  try {
    const convertedFriends = await Promise.all(
      friends?.map(async (friend) => {
        // const isBlocked = await friendDetails({
        //   $or: [
        //     {
        //       sourceId: user,
        //       targetId: friend._id,
        //       status: FRIENDSHIP_STATUS.accepted,
        //       messageblock: user,
        //     },
        //     {
        //       sourceId: friend._id,
        //       targetId: user,
        //       status: FRIENDSHIP_STATUS.accepted,
        //       messageblock: user,
        //     },
        //   ],
        // });

        if (isBlocked.success) {
          friend["avatar"] = `${currDir}/defaultPeopleAvatar.png`;
        }

        return friend;
      })
    );

    return convertedFriends;
  } catch (error) {
    return [];
  }
};


export const handleLastMessage = async ({ chat, user, message }) => {
  try {
    await ChatModel.findOneAndUpdate({ chat, user }, {
      $set: {
        lastMessage: message, markUnread: false,
        receiverType: message.receiverType
      }, $inc: { unread: String(user) == String(message.sender) ? 0 : 1 }
    }, { new: true, upsert: true })
  } catch (error) {
    console.log("error while handle last message", error)
  }
}

export const handleChatBlock = async ({ user, chat, data, status }) => {
  try {
    SocketConnection.emitSocketEvent(
      `user_${user._id}`,
      SOCKET_EVENTS.chat_block,
      { chat: chat._id, status: status }
    );
    SocketConnection.emitSocketEvent(
      `user_${chat._id}`,
      SOCKET_EVENTS.blocked_me,
      {
        chat: user._id,
        status: status,
        data: data
      }
    );
    const messageData = {
      sender: user._id,
      receiver: chat._id,
      receiverType: RECEIVER_TYPE.user,
      status: MESSAGE_STATUS.notify,
      contentType: CONTENT_TYPE.notification,
      action: status ? NOTIFICATION_ACTION.block : NOTIFICATION_ACTION.unblock,
    };
    const message = await createMessage(messageData);
    if (message.success) {
      handleNewMessage({
        rawMessage: message.data,
        message: { ...message.data.toJSON(), unblocking: true },
        receiver: chat,
        sender: user,
      });
    }
  } catch (error) {
    console.log("error while handlechat block", error)
  }
}