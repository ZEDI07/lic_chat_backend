import mongoose from "mongoose";
import SocketConnection from "../../socket.js";
import { CALL, CONTENT_TYPE, MESSAGE_STATUS, ONLINE_PRIVACY, PRIVACY_STATUS, RECEIVER_TYPE, SOCKET_EVENTS } from "../config/constant.js";
import { handleCallAccept, handleCallEnded, handleCallJoin, handleCallRecived, handleCallReject, handleCallSwitch, handleSwitchApproved } from "../helpers/call.js";
import { handleUserStatus } from "../helpers/user.js";
import { updateChatInfo } from "../models/chat.js";
import { getGroupDetails } from "../models/group.js";
import { allMessageSeenStatus, allSentMessagesToMe, bulkWriteMessageStatus, chatUnreadMessages, messageInfo, messageStatus, updateMessage, updateMessageStatus, updateMesssages } from "../models/message.js";
import userModel from "../models/schema/user.js";
import { userInfo } from "../models/user.js";

export const handleSocketConnection = async (user) => {
  try {
    const userdetails = await userModel
      .findOneAndUpdate(
        { _id: user, status: true },
        { active: true },
        { new: true }
      )
      .lean();
    if (userdetails) {
      const { privacy } = userdetails;
      if (
        (privacy.online == ONLINE_PRIVACY.sameAs &&
          !privacy.lastSeen == PRIVACY_STATUS.nobody) ||
        privacy.online == ONLINE_PRIVACY.everyone
      ) {
        handleUserStatus({ user: userdetails });
        // const activefriend = await activeFriends({ user });
        // if (activefriend.success) {
        //   const io = SocketConnection.getSocketInstance();
        //   for (let friend of activefriend.data) {
        //     io.to(`user_${friend._id}`).emit(SOCKET_EVENTS.user_status, {
        //       _id,
        //       name,
        //       avatar,
        //       active,
        //       lastActive:
        //         privacy.lastSeen == PRIVACY_STATUS.nobody ? null : lastActive,
        //     });
        //   }
        // }
      }
      const allMessages = await allSentMessagesToMe(user);
      if (allMessages.success) {
        allMessages.data.forEach((each) => {
          handleMessageReceived(each.message, user);
        });
      }
      // unreadCountService(user);
    }
  } catch (error) {
    console.log("Error in handle socket connection", error);
  }
};

export const handleSocketDisconnection = async (user) => {
  try {
    console.log("inside handle disconnection")
    const userdetails = await userModel.findOneAndUpdate(
      { _id: user, status: true },
      { active: false, lastActive: Date.now() },
      {
        new: true,
        // projection: {
        //   name: 1,
        //   avatar: 1,
        //   active: 1,
        //   lastActive: 1,
        //   privacy: 1,
        // },
      }
    );
    if (userdetails) {
      const { _id, name, avatar, active, lastActive, privacy } = userdetails;
      if (
        (privacy.online == ONLINE_PRIVACY.sameAs &&
          !privacy.lastSeen == PRIVACY_STATUS.nobody) ||
        privacy.online == ONLINE_PRIVACY.everyone
      ) {
        handleUserStatus({ user: userdetails });
        // const activefriend = await activeFriends({ user });
        // if (activefriend.success) {
        //   const io = SocketConnection.getSocketInstance();
        //   for (let friend of activefriend.data) {
        //     io.to(`user_${friend._id}`).emit(SOCKET_EVENTS.user_status, {
        //       _id,
        //       name,
        //       avatar,
        //       active,
        //       lastActive:
        //         privacy.lastSeen == PRIVACY_STATUS.nobody ? null : lastActive,
        //     });
        //   }
        // }
      }
    }
  } catch (error) {
    console.log("Error in handle socket disconnection", error);
  }
};

export const handleMessageSeen = async (data, user) => {
  try {
    let readReceipt = await userInfo(
      {
        $or: [{ _id: data.chat }, { _id: user }],
        "privacy.readRecipts": false,
      },
      { user: 1 }
    );
    readReceipt = readReceipt.success;
    SocketConnection.emitSocketEvent(
      [`user_${user}`],
      SOCKET_EVENTS.chat_read,
      { chat: data.chat }
    );
    const unreadMessages = await chatUnreadMessages({
      chat: data.chat,
      receiverType: data.receiverType,
      user,
    });
    if (!unreadMessages.success) return;
    const messageIds = [];
    const writeOps = [];
    for (let message of unreadMessages.data) {
      messageIds.push(new mongoose.Types.ObjectId(message._id));
      writeOps.push({
        updateOne: {
          filter: {
            message: message._id,
            user: user,
          },
          update: {
            status: readReceipt ? MESSAGE_STATUS.seenOff : MESSAGE_STATUS.seen,
            ...!readReceipt ? { seen: Date.now() } : {}
          },
        },
      });
    }
    updateChatInfo({ chat: data.chat, user: user, receiverType: data.receiverType }, { unread: 0, markUnread: false })
    // markRead({ user, chats: [data.chat] });
    const response = await bulkWriteMessageStatus(writeOps);
    if (!response.success) return;
    if (data.receiverType == RECEIVER_TYPE.group) {
      const response = await allMessageSeenStatus(messageIds);
      if (!response.success) return;
      for (let msg of response.data) {
        !readReceipt && updateMessage({ _id: msg.message._id }, { status: MESSAGE_STATUS.seen })
        SocketConnection.emitSocketEvent(
          [`user_${msg.message.sender}`],
          SOCKET_EVENTS.message_seen,
          { chat: data.chat, messages: [msg.message._id], readReceipt }
        );
      }
    } else if (data.receiverType == RECEIVER_TYPE.user && messageIds.length) {
      console.log("message ids", messageIds)
      !readReceipt && updateMesssages({ _id: { $in: messageIds } }, { status: MESSAGE_STATUS.seen })
      SocketConnection.emitSocketEvent(
        [`user_${data.chat}`],
        SOCKET_EVENTS.message_seen,
        { chat: user, messages: messageIds, readReceipt }
      );
    }
  } catch (error) {
    console.log("error", error);
  }
};

export const handleMessageReceived = async (message, user) => {
  try {
    const messageData = await messageInfo({ _id: message, contentType: { $nin: [CONTENT_TYPE.audioCall, CONTENT_TYPE.videoCall] } });
    if (!messageData.success || String(messageData.data.sender) == String(user))
      return;
    const response = await updateMessageStatus(
      {
        message: message,
        user: user,
        status: { $lt: MESSAGE_STATUS.received },
      },
      { status: MESSAGE_STATUS.received, received: Date.now() }
    );
    if (!response.success) return;
    if (messageData.data.receiverType == RECEIVER_TYPE.group) {
      const status = await messageStatus({
        message: message,
        status: { $eq: MESSAGE_STATUS.sent },
      });
      if (!status.success || status.data.length) return;
      messageData.data.status = MESSAGE_STATUS.received;
      await messageData.data.save();
      SocketConnection.emitSocketEvent(
        `user_${messageData.data.sender}`,
        SOCKET_EVENTS.message_received,
        { chat: messageData.data.receiver, message }
      );
    } else if (messageData.data.receiverType == RECEIVER_TYPE.user) {
      messageData.data.status = MESSAGE_STATUS.received;
      await messageData.data.save();
      SocketConnection.emitSocketEvent(
        `user_${messageData.data.sender}`,
        SOCKET_EVENTS.message_received,
        { chat: messageData.data.receiver, message }
      );
    }
  } catch (error) {
    console.log(error);
  }
};

export const userAction = async (data, user) => {
  try {
    if (data.receiverType == RECEIVER_TYPE.user) {
      SocketConnection.emitSocketEvent(
        `user_${data.chat}`,
        SOCKET_EVENTS.user_action,
        {
          chat: user,
          action: data.action,
          label: `${data.action}...`,
        }
      );
    } else if (data.receiverType == RECEIVER_TYPE.group) {
      const groupData = await getGroupDetails(data.chat);
      const emitTo = [];
      for (let member of groupData.data.members) {
        if (String(member.user._id) == String(user)) {
          user = member.user;
        } else emitTo.push(`user_${member.user._id}`);
      }
      SocketConnection.emitSocketEvent(emitTo, SOCKET_EVENTS.user_action, {
        chat: data.chat,
        action: data.action,
        user: {
          _id: user._id,
          name: user.name,
          active: user.active,
          email: user.email,
          avatar: user.avatar,
          lastActive: user.lastActive,
          verified: user.verified,
          uid: user.uid,
        },
        label: `${user.name} is ${data.action}...`,
      });
    }
  } catch (error) {
    console.log("error in user action", error);
  }
};

// export const updateLocation = async (data, user) => {
//   try {
//     const currentDate = new Date();
//     const endedLocation = await updateMessage(
//       { _id: data.message, "location.endTime": { $lt: currentDate } },
//       {
//         $set: {
//           "location.status": LOCATION_STATUS.ended,
//         },
//       }
//     );
//     if (endedLocation.success) return;
//     const updatedMessageData = await updateMessage(
//       { _id: data.message, "location.endTime": { $gte: currentDate } },
//       {
//         $set: {
//           "location.coordinates": data.coordinates,
//         },
//       }
//     );
//     console.log(updatedMessageData, "update message");

//     if (!updatedMessageData.success) return;

//     const emitSocket = (emitTo, updatedMessageData, chat) => {
//       SocketConnection.emitSocketEvent(emitTo, SOCKET_EVENTS.location_update, {
//         message: updatedMessageData?.data._id,
//         chat: chat,
//         coordinates: updatedMessageData?.data?.location?.coordinates,
//       });
//     };

//     if (data.receiverType == RECEIVER_TYPE.group) {
//       const response = await getGroupDetails(data.chat);
//       if (!response.success) return;
//       const emitTo = [`user_${updatedMessageData?.data?.sender}`];
//       for (let member of response.data?.members) {
//         emitTo.push(`user_${member}`);
//       }
//       emitSocket(emitTo, updatedMessageData, updatedMessageData.data.receiver);
//     } else if (data.receiverType == RECEIVER_TYPE.user) {
//       const emitTo = [
//         `user_${updatedMessageData?.data.receiver}`,
//         `user_${updatedMessageData?.data.sender}`,
//       ];
//       emitSocket(emitTo, updatedMessageData, updatedMessageData.data.sender);
//     }
//   } catch (error) {
//     console.log("error", error);
//   }
// };

// export const socketGroupNotify = async ({
//   user,
//   group,
//   receiverType,
//   status,
//   contentType,
//   action,
//   actionOn,
//   updateTo,
//   groupUpdates,
//   req,
// }) => {
//   let messageData = {
//     sender: user._id, // change
//     receiver: group,
//     receiverType: receiverType,
//     status: status,
//     contentType: contentType,
//     action,
//     actionOn,
//   };
//   const message = await createMessage(messageData);
//   const receiver = await getGroupDetails(group);
//   if (receiver.success && message.success) {
//     handleNewMessage({
//       message: { ...message.data.toJSON(), updateTo, groupUpdates, req },
//       receiver: receiver.data,
//       sender: user,
//     });
//   }
// };

// export const muteChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.chat_mute, {
//       chat: data.chat,
//       menu: data.menu,
//     });
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const unmuteChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(
//       `user_${user}`,
//       SOCKET_EVENTS.chat_unmute,
//       {
//         chat: data.chat,
//         menu: data.menu,
//       }
//     );
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const pinChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.chat_pin, {
//       chat: data.chat,
//       menu: data.menu,
//     });
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const unpinChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.chat_unpin, {
//       chat: data.chat,
//       menu: data.menu,
//     });
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const blockChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.chat_block, {
//       chat: data.chat,
//       menu: data.menu,
//     });
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const unblockChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(
//       `user_${user}`,
//       SOCKET_EVENTS.chat_unblock,
//       {
//         chat: data.chat,
//         menu: data.menu,
//       }
//     );
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const unreadChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(
//       `user_${user}`,
//       SOCKET_EVENTS.chat_unread,
//       {
//         chat: data.chat,
//         menu: data.menu,
//       }
//     );
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const readChat = async (data, user) => {
//   try {
//     SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.chat_read, {
//       chat: data.chat,
//       menu: data.menu,
//     });
//   } catch (error) {
//     console.log("error in user action", error);
//   }
// };

// export const unreadCountService = async (user) => {
//   try {
//     const unreadCount = await unReadChats({
//       user: user,
//     });
//     if (unreadCount.success)
//       SocketConnection.emitSocketEvent(
//         [`user_${user}`],
//         SOCKET_EVENTS.unread_count,
//         { unread_count: unreadCount.data || 0 }
//       );
//   } catch (error) {
//     console.log("error in user unread", error);
//     return 0;
//   }
// };

// export const newStorySocket = async ({ data, user }) => {
//   try {
//     const response = await friendList({ user: user });

//     const friends = response.data.map((friend) => {
//       if (friend.except === false && friend.blocked === false)
//         return `user_${friend._id}`;
//     });
//     SocketConnection.emitSocketEvent(
//       [...friends, `user_${user}`],
//       SOCKET_EVENTS.new_story,
//       data
//     );
//   } catch (error) {
//     console.log("error in new_story", error);
//     return;
//   }
// };

// export const storySeenSocket = async ({ data, user }) => {
//   try {
//     const response = await updateStory({ _id: data.story }, {}, { new: 1 });
//     if (!response.success) return;
//     const storyOwner = response.data.user;
//     SocketConnection.emitSocketEvent(
//       [`user_${storyOwner}`, `user_${user}`],
//       SOCKET_EVENTS.story_seen,
//       data
//     );
//   } catch (error) {
//     console.log("error in new_story", error);
//     return;
//   }
// };

export const storyDeleted = async ({ data, user }) => {
  try {
    const response = await friendList({ user: user });

    const friends = response.data.map((friend) => {
      if (friend.except === false && friend.blocked === false)
        return `user_${friend._id}`;
    });
    SocketConnection.emitSocketEvent(
      [...friends, `user_${user}`],
      SOCKET_EVENTS.story_ended,
      data
    );
  } catch (error) {
    console.log("error in new_story", error);
    return;
  }
};

export const handleCall = async ({ user, data }) => {
  try {
    console.log("handle call", user, data)
    switch (data.type) {
      case CALL.received:
        handleCallRecived({ user, ...data });
        break;
      case CALL.accept:
        handleCallAccept({ user, ...data });
        break;
      case CALL.rejected:
        handleCallReject({ user, ...data })
        break;
      case CALL.ended:
        handleCallEnded({ user, ...data })
        break
      case CALL.join:
        handleCallJoin({ user, ...data });
        break;
      case CALL.switch:
        handleCallSwitch({ user, ...data })
        break;
      case CALL.approved:
        handleSwitchApproved({ user, ...data });
        break;
    }
  } catch (error) {
    console.log("error while call handling", error)
  }
}