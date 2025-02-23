import { STATUS_CODE } from "../../config/constant.js";
import { deleteFile } from "../../models/filemanager.js";
import * as service from "../../models/reaction.js";
import { addReactionSchema, editReactionSchema } from "../../validation/admin.js";

export const reaction = (req, res) => {
  res.render("reaction");
};

export const addReaction = (req, res) => {
  res.render("addReaction");
};

export const addReactionPost = async (req, res, next) => {
  try {
    const { error } = addReactionSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await service.addReaction(req.body);
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const getReactions = async (req, res, next) => {
  try {
    const response = await service.getReactions({});
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const editReaction = async (req, res) => {
  try {
    if (req.query.id) {
      const response = await service.getReactions({ id: req.query.id });
      if (response.success && response.data.length) {
        return res.render("editReaction", { data: response.data[0] });
      }
    }
    return res.render("reaction", {
      success: false,
      message: "error while getting reaction details",
    });
  } catch (error) {
    return { success: false, message: "error while edit reaction." };
  }
};

export const editReactionPost = async (req, res, next) => {
  try {
    const { error } = editReactionSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await service.updateReactionDetails(
      { _id: req.body.id, status: true },
      req.body
    );
    if (response.success) {
      req.body.media && deleteFile(response.data.media);
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteReaction = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required reaction Id" });
    }
    const response = await service.updateReactionDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (response.success) {
      deleteFile(response.data.media);
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Reaction deleted Successfully" });
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};
