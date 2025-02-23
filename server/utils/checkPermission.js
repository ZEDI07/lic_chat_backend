import { getRole } from "../models/role.js";

export const checkPermission = async (req, permission) => {
  try {
    let userPermissions = req.permissions;
    if (!userPermissions) {
      const role = await getRole({ roleId: req.user.role });
      if (!role.success) return false;
      userPermissions = role.data.permissions;
    }
    if (userPermissions.find((ele) => ele.key === permission)) return true;
    return false;
  } catch (error) {
    console.log("error while checking permission.", error);
    return false;
  }
};
