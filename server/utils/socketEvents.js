import Redis from "../../redis.js";
import { ROLE_CODE, SOCKET_EVENTS, USER_STATUS } from "../config/constant.js";
import { userDetail } from "../models/user.js";
import * as validation from "../validation/socket.js";
import { decodeJwtToken } from "./common.js";
import * as socketService from "./socketHelper.js";

function socketEvents(io) {
  io.on("connection", async (socket) => {
    try {
      // Decoding JWT Token
      const decoded = decodeJwtToken(socket.handshake.auth.token);
      if (!decoded.success) {
        console.log("error with token>>", decoded);
        socket.disconnect();
        return;
      }
      const id = decoded.data._id;
      // Getting user Details
      const user = await userDetail({
        _id: id,
        status: USER_STATUS.active,
      });
      if (!user.success) {
        console.log("error with user Details", user);
        socket.disconnect();
        return;
      }
      const client = Redis.getRedisClient();
      const rooms = io.sockets.adapter.rooms;
      if (client) {
        const connections = await client.rPush(id, socket.id);
        console.log("connections", connections)
        connections == 1 && socketService.handleSocketConnection(id);
      } else {
        !rooms.has(`user_${id}`) && socketService.handleSocketConnection(id);
      }

      socket.join(`user_${id}`);
      user.data.role == ROLE_CODE.superadmin && socket.join("admin");
      console.log("SOCKET CONNECTED  --- ", new Date(), " ---", id);
      // await emitActiveLocations(id); // give all active locations info to user so that he/she give exact locations

      // Handling Socket Disconnect
      socket.on("disconnect", async () => {
        console.log("SOCKET DISCONNECTED  xxx ", new Date(), " xxx", id);
        if (client) {
          await client.lRem(id, 1, socket.id);
          !(await client.lLen(id)) && socketService.handleSocketDisconnection(id);
        } else
          !rooms.has(`user_${id}`) && socketService.handleSocketDisconnection(id);
      });

      // socket.on(SOCKET_EVENTS.initiateCall, (data, callback) => {
      //   const { error } = validation.initiateCall(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   data.caller = id;
      //   socketService.handleInitiateCall(data, socket);
      // });

      // socket.on("end_call", (data, callback) => {
      //   if (!data.callId) {
      //     callback && callback({ success: true, error: "Required Call Id" });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.handleCallDisconnection(data, id, socket);
      // });

      // socket.on("receive_call", (data, callback) => {
      //   if (!data.callId) {
      //     callback && callback({ success: true, error: "Required Call Id" });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.handleCallConnection(data, id, socket);
      // });

      // socket.on("reject_call", (data, callback) => {
      //   if (!data.callId) {
      //     callback && callback({ success: true, error: "Required Call Id" });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.handleCallRejection(data);
      // });

      socket.on(SOCKET_EVENTS.call, (data) => {
        socketService.handleCall({ user: id, data })
      })

      socket.on(SOCKET_EVENTS.message_seen, (data, callback) => {
        const { error } = validation.messageSeen(data);
        if (error) {
          callback && callback({ success: true, error: error.message });
          return;
        }
        callback && callback({ success: true, message: "Ok" });
        socketService.handleMessageSeen(data, id);
      });

      socket.on(SOCKET_EVENTS.message_received, (message, callback) => {
        if (typeof message !== "string") {
          callback &&
            callback({ success: true, error: "message id should be string" });
          return;
        }
        callback && callback({ success: true, message: "Ok" });
        socketService.handleMessageReceived(message, id);
      });

      socket.on(SOCKET_EVENTS.user_action, (data, callback) => {
        const { error } = validation.userAction(data);
        if (error) {
          callback && callback({ success: true, error: error.message });
          return;
        }
        callback && callback({ success: true, message: "Ok" });
        socketService.userAction(data, id);
      });

      // socket.on(SOCKET_EVENTS.location_update, (data, callback) => {
      //   const { error } = validation.locationUpdate(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.updateLocation(data, id);
      // });

      // Below Socket event to be reviewed >>>>>>>>>>>>>>
      // socket.on(SOCKET_EVENTS.chat_mute, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.muteChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_unmute, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.unmuteChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_pin, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.pinChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_unpin, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.unpinChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_block, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.blockChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_unblock, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.unblockChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_unread, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.unreadChat(data, id);
      // });

      // socket.on(SOCKET_EVENTS.chat_read, (data, callback) => {
      //   const { error } = validation.muteData(data);
      //   if (error) {
      //     callback && callback({ success: true, error: error.message });
      //     return;
      //   }
      //   callback && callback({ success: true, message: "Ok" });
      //   socketService.readChat(data, id);
      // });
    } catch (error) {
      console.log("error socket connection", error);
    }
  });
}

export default socketEvents;
