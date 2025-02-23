import { STATUS_CODE } from "../../config/constant.js";
import * as services from "../../models/filemanager.js";
import Storage from "../../utils/storage.js";
import * as validation from "../../validation/admin.js";

export const fileManager = async (req, res) => {
  try {
    const type = await services.fileTypes();
    return res.render("fileManager", { type });
  } catch (error) {
    console.log("ERROR >>", error);
  }
};

export const fileUpload = async (req, res) => {
  try {
    console.log(req.params.type, "file type");
    req.file.fileType = req.params.type;
    const savedData = await Storage.uploadFile(req.file);
    if (savedData.success) {
      const fileDetails = await services.addFile(savedData.data);
      return res.status(STATUS_CODE.success).json(fileDetails);
    }
    return res.status(STATUS_CODE.bad_request).json(savedData);
  } catch (error) {
    console.log(error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "Unknwon error" });
  }
};

export const getFiles = async (req, res) => {
  try {
    const { error } = validation.getFile(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const data = await services.getFiles(req.query);
    if (data.success) return res.status(STATUS_CODE.success).json(data);
    return res.status(STATUS_CODE.bad_request).json(data);
  } catch (error) {
    console.log("Error >>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error" });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { error } = validation.updateFileStatus(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    let response = await services.getfileDeatils({
      _id: req.body.id,
      status: true,
    });
    if (response.success) {
      response = await Storage.deleteFile(response.data);
      if (response.success) {
        response = await services.updateFileStatus(
          { _id: req.body.id, status: true },
          { status: false }
        );
        if (response.success)
          return res.status(STATUS_CODE.success).json(response);
      }
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error >>", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error" });
  }
};
