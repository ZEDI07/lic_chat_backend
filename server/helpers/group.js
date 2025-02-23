import mongoose from "mongoose";
import SocketConnection from "../../socket.js";
import { CONTENT_TYPE, MEMBER_GROUP_ROLE, RECEIVER_TYPE, SOCKET_EVENTS, USER_STATUS } from "../config/constant.js";
import { getGroupDetails, groupMembers } from "../models/group.js";
import { createMessage } from "../models/message.js";
import { handleNewMessage } from "./message.js";

export const handleGroupUpdate = async ({ id, action, user, members }) => {
  try {
    const response = await getGroupDetails(id);
    if (!response.success) return;
    const group = response.data;
    const message = {
      sender: user._id,
      receiver: group._id,
      receiverType: RECEIVER_TYPE.group,
      contentType: CONTENT_TYPE.notification,
      action,
      actionUsers: members,
    };
    const newMessage = await createMessage(message);
    if (newMessage.success)
      handleNewMessage({
        rawMessage: newMessage.data,
        message: newMessage.data.toJSON(),
        receiver: group,
        sender: user,
      });
  } catch (error) {
    console.log("Error while group update", error);
  }
};

export const handleGroupJoinRequest = async ({ group, pending }) => {
  try {
    const admins = await groupMembers({ chat: new mongoose.Types.ObjectId(group), role: { $in: [MEMBER_GROUP_ROLE.superAdmin, MEMBER_GROUP_ROLE.admin] }, status: USER_STATUS.active });
    if (admins.length) {
      SocketConnection.emitSocketEvent(admins.map(admin => `user_${admin._id}`), SOCKET_EVENTS.group_updates, { group, type: "pendingMembers", pendingMembers: pending })
    }
  } catch (error) {
    console.log("Errow while handleGroup Join Request", error)
  }
}