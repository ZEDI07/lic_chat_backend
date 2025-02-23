import { decodeJwtToken } from "../utils/common.js";
import { userDetail } from "../models/user.js";
import { ROLE_CODE } from "../config/constant.js";

export const sessionAuth = async (req, res, next) => {
  try {
    if (req.session.auth) {
      const token = req.session.token;
      const tokendata = decodeJwtToken(token);

      if (!tokendata.success) {
        return res.redirect("/login");
      }
      const userDetails = await userDetail({
        _id: tokendata.data._id,
        role: ROLE_CODE.superadmin,
      });
      if (userDetails.success) {
        req.user = userDetails.data;
        res.locals.user = userDetails.data;
        next();
      } else {
        return res.redirect("/login");
      }
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    return res.redirect("/login");
  }
};