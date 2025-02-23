import { STATUS_CODE } from "../../config/constant.js";
import { addRole, updateRoleData } from "../../models/role.js";
import * as validation from "../../validation/x-api/level.js";

export const addLevel = async (req, res, next) => {
  try {
    const { error } = validation.levelSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    }
    const body = req.body;
    const response = await addRole({
      name: body.title,
      roleId: body.level_id,
      description: body.description,
    });
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const updateLevel = async (req, res, next) => {
  try {
    const { error } = validation.updatelevelSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await updateRoleData(
      { roleId: req.params.level_id },
      { name: req.body.title, description: req.body.description }
    );
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const deleteLevel = async (req, res, next) => {
  try {
    const levelId = req.params.level_id;
    const response = await updateRoleData(
      { roleId: levelId },
      { status: false }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ messgae: "Level Deleted Successfully" });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};
