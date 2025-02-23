import { STATUS_CODE } from "../config/constant.js";
import { getCredential } from "../models/apiCredentials.js";

const clientAuth = async (req, res, next) => {
  try {
    const clientId = req.header("Client-ID");
    const clientSecret = req.header("Client-Secret");
    const response = await getCredential({
      _id: clientId,
      clientSecret: clientSecret,
      enabled: true,
    });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Invalid Client" });
    next();
  } catch (error) {
    return res
      .status(STATUS_CODE.server_error)
      .json({ code: 500, message: "Unknown Error" });
  }
};

export default clientAuth;
