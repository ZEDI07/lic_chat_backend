import { STATUS_CODE } from "../config/constant.js";
import { getRole } from "../models/role.js";

export const checkPermission = (permission) => async (req, res, next) => {
  try {
    let userPermissions = req.permissions;
    if (!userPermissions) {
      const role = await getRole({ roleId: req.user.role });
      if (!role.success)
        return res
          .status(STATUS_CODE.bad_request)
          .json({ message: "You don't have permission." });
      userPermissions = role.data.permissions;
    }
    if (userPermissions.find((ele) => ele.key === permission)) return next();
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: "You don't have permission." });
  } catch (error) {
    console.log("error");
    return res.status(STATUS_CODE.bad_request).json({ message: error.message });
  }
};
