import { STATUS_CODE, USER_STATUS } from "../config/constant.js";
import { getRole } from "../models/role.js";
import { userDetail } from "../models/user.js";
import { decodeJwtToken } from "../utils/common.js";

export const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token)
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ success: false, message: "Required Token" });
    //Decoding jwt token;
    const tokendata = decodeJwtToken(token);
    if (!tokendata.success)
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ success: false, message: tokendata.message });
    // Fetching user details with id.
    const userDetails = await userDetail({
      _id: tokendata.data._id,
      status: USER_STATUS.active,
    });
    if (userDetails.success) {
      req.user = userDetails.data;
      const role = await getRole({ roleId: userDetails?.data?.role });
      if (role.success) req.permissions = role.data.permissions;
      next();
    } else {
      return res
        .status(STATUS_CODE.unauthorized)
        .json({ success: false, message: "invalid user" });
    }
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Something went wrong." });
  }
};
