import { STATUS_CODE } from "../../config/constant.js";
import * as service from "../../models/apiCredentials.js";
import { updateCredentialSchema } from "../../validation/admin.js";
export const apicredentials = async (req, res) => {
  return res.render("apiCredentials");
};

export const addNewClient = async (req, res, next) => {
  try {
    if (!req.body.name)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Required Client Name" });
    const response = await service.newCredentials(req.body);
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Added New Client" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const getAllCredentials = async (req, res, next) => {
  try {
    const response = await service.allCredentials();
    if (response.success)
      return res.status(STATUS_CODE.success).json(response.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const deleteCredentials = async (req, res, next) => {
  try {
    if (!req.body.id)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Required Credential id" });
    const response = await service.updateCredential(
      { _id: req.body.id },
      { status: false }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Credentails deleted successfully" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};

export const updateCredentialData = async (req, res, next) => {
  try {
    const { error } = updateCredentialSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });
    const response = await service.enableCredential(req.body.id);
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ message: "Updated Successfully" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: response.message });
  } catch (error) {
    next(error);
  }
};
