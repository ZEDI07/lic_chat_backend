import SocketConnection from "../../socket.js";
import { SOCKET_EVENTS, USER_STATUS } from "../config/constant.js";
import { usersDetail } from "../models/user.js";

export const handlePermissionUpdate = async (role) => {
    try {
        const roleUsers = await usersDetail({ role: role.roleId, status: USER_STATUS.active }, { _id: 1 })
        if (roleUsers.success) {
            const users = roleUsers.data.map(user => `user_${user._id}`);
            const permissions = role.permissions.map(permission => permission.key)
            SocketConnection.emitSocketEvent(users, SOCKET_EVENTS.permission_updated, permissions)
        }
    } catch (error) {
        console.log("error while handling permission update", error)
    }
}