import { CONTENT_TYPE, STATUS_CODE } from "../../config/constant.js";
import { handleDeletedMessageEveryone } from "../../helpers/message.js";
import * as services from "../../models/message.js";

export const message = (req, res, next) => {
  res.render("message", {
    token: req.session.token,
  });
};

export const messageList = async (req, res) => {
  try {
    const response = await services.messagesList(req);
    if (response.success) {
      return res.status(200).json(response);
    }
    return res.status(400).json(response);
  } catch (error) {
    console.log("Error get user list", error);
    return res.status(500).json({ success: false, message: "Unknown Error.." });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const response = await services.updateMessage(
      { _id: req.params.message },
      {
        deleted: true,
        deletedBy: req.user._id,
        contentType: { $ne: CONTENT_TYPE.notification },
      }
    );
    if (response.success) {
      handleDeletedMessageEveryone(req.params.message);
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknown Error.." });
  }
};
