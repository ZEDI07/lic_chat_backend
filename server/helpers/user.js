import SocketConnection from "../../socket.js";
import { SOCKET_EVENTS } from "../config/constant.js";
import { userProfile } from "../models/friend.js";
import { chatProfilePrivacy } from "../models/user.js";

export const handleUserStatus = async ({ user }) => {
  try {
    const activeUsers = await userProfile(user);
    activeUsers.forEach(async (user) => {
      SocketConnection.emitSocketEvent(
        `user_${user.user}`,
        SOCKET_EVENTS.user_status,
        user.chat
      );
    });
  } catch (error) {
    console.log("error while handling privacy update", error);
  }
};

export const handlePrivacyChange = async (user) => {
  try {
    const users = await chatProfilePrivacy(user);
    users.forEach((user) => {
      SocketConnection.emitSocketEvent(
        `user_${user.user}`,
        SOCKET_EVENTS.privacy_update,
        user
      );
    });
  } catch (error) {
    console.log("handle privacy change user", error);
  }
};
