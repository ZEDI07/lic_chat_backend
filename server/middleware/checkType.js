import { FILE_TYPE, STATUS_CODE } from "../config/constant.js";

export default function checkType(req, res, next) {
  try {
    const type = req.params.type;
    if (Object.keys(FILE_TYPE).includes(type)) {
      return next();
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: true, message: "invalid file type" });
  } catch (error) {
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: error.message });
  }
}
