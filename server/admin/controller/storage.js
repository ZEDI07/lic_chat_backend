import {
  STATUS_CODE,
  STORAGE_TYPE_NAME,
  STORAGE_TYPE,
} from "../../config/constant.js";
import { SERVER_URL } from "../../config/index.js";
import * as service from "../../models/storage.js";
import * as validation from "../../validation/admin.js";

export const storageSetting = (req, res) => {
  try {
    res.render("storageService");
  } catch (error) {
    console.log(error);
  }
};

export const configStorageSetting = async (req, res, next) => {
  try {
    const { error } = validation.configStorageSetting(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    if (
      req.body.credentials?.cdn_url &&
      req.body.credentials.cdn_url[req.body.credentials.cdn_url.length - 1] !==
        "/"
    )
      req.body.credentials.cdn_url = req.body.credentials.cdn_url + "/";
    const { region, bucket } = req.body?.credentials || {};
    switch (req.body.storage) {
      case STORAGE_TYPE.amazon_s3:
        req.body.name = STORAGE_TYPE_NAME.amazon_s3;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://${bucket}.s3.${region}.amazonaws.com/`);
        break;
      case STORAGE_TYPE.amazon_s3_compatible_storage:
        req.body.name = STORAGE_TYPE_NAME.amazon_s3_compatible_storage;
        break;
      case STORAGE_TYPE.local_storage:
        req.body.name = STORAGE_TYPE_NAME.local_storage;
        req.body.credentials = { cdn_url: `${SERVER_URL}/` };
        break;
      case STORAGE_TYPE.digital_ocean_space:
        req.body.name = STORAGE_TYPE_NAME.digital_ocean_space;
        req.body.credentials.endpoint_url = `https://${region}.digitaloceanspaces.com`;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://${bucket}.${region}.digitaloceanspaces.com/`);
        break;
      case STORAGE_TYPE.wasabi_cloud_storage:
        req.body.name = STORAGE_TYPE_NAME.wasabi_cloud_storage;
        req.body.credentials.endpoint_url = `https://s3.${region}.wasabisys.com`;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://s3.${region}.wasabisys.com/${bucket}/`);
        break;
      case STORAGE_TYPE.virtual_file_system:
        req.body.name = STORAGE_TYPE_NAME.virtual_file_system;
        req.body.credentials.path[req.body.credentials.path.length - 1] !==
          "/" && (req.body.credentials.path = `${req.body.credentials.path}/`);
        break;
      default:
        break;
    }
    const response = await service.configStorage(req.body);
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error while config storage setting", error);
    next(error);
  }
};

export const storageConfig = async (req, res, next) => {
  try {
    const data = await service.storageConfig();
    if (data.success) return res.status(STATUS_CODE.success).json(data);
    return res.status(STATUS_CODE.bad_request).json(data);
  } catch (error) {
    console.log("ERROR storageConfig", error);
    next(error);
  }
};

export const addStorageServices = async (req, res, next) => {
  try {
    return res.render("storageServiceSetting");
  } catch (error) {
    console.log("Error >", error);
  }
};

export const editStorageServices = async (req, res, next) => {
  try {
    if (!req.query.id) {
      return res.redirect("/storage");
    }
    return res.render("editStorageSetting");
  } catch (error) {
    console.log("error >>", error);
    return res.redirect("/storage");
  }
};

export const getStorageServices = async (req, res, next) => {
  try {
    if (!req.query.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Storage Id" });
    }
    const response = await service.getStorageServiceConfig({
      _id: req.query.id,
      status: true,
    });
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const updateStorageSetting = async (req, res, next) => {
  try {
    const { error } = validation.updateStorageSetting(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    if (
      req.body.credentials?.cdn_url &&
      req.body.credentials.cdn_url[req.body.credentials.cdn_url.length - 1] !==
        "/"
    )
      req.body.credentials.cdn_url = req.body.credentials.cdn_url + "/";
    const { region, bucket } = req.body.credentials;
    switch (req.body.storage) {
      case STORAGE_TYPE.amazon_s3:
        req.body.name = STORAGE_TYPE_NAME.amazon_s3;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://${bucket}.s3.${region}.amazonaws.com/`);
        break;
      case STORAGE_TYPE.amazon_s3_compatible_storage:
        req.body.name = STORAGE_TYPE_NAME.amazon_s3_compatible_storage;
        break;
      case STORAGE_TYPE.local_storage:
        req.body.name = STORAGE_TYPE_NAME.local_storage;
        req.body.credentials = { cdn_url: `${SERVER_URL}/` };
        break;
      case STORAGE_TYPE.digital_ocean_space:
        req.body.name = STORAGE_TYPE_NAME.digital_ocean_space;
        req.body.credentials.endpoint_url = `https://${region}.digitaloceanspaces.com`;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://${bucket}.${region}.digitaloceanspaces.com/`);
        break;
      case STORAGE_TYPE.wasabi_cloud_storage:
        req.body.name = STORAGE_TYPE_NAME.wasabi_cloud_storage;
        req.body.credentials.endpoint_url = `https://s3.${region}.wasabisys.com`;
        !req.body.credentials.cdn_url &&
          (req.body.credentials.cdn_url = `https://s3.${region}.wasabisys.com/${bucket}/`);
        break;
      case STORAGE_TYPE.virtual_file_system:
        req.body.name = STORAGE_TYPE_NAME.virtual_file_system;
        req.body.credentials.path[req.body.credentials.path.length - 1] !==
          "/" && (req.body.credentials.path = `${req.body.credentials.path}/`);
        break;
      default:
        break;
    }
    const response = await service.updateStorageSetting(
      { _id: req.body.id },
      req.body
    );
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error while updating storage setting >>", error);
    next(error);
  }
};

export const deleteStorage = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Storage id." });
    }
    const response = await service.updateStorageSetting(
      { _id: req.body.id, status: true, default: false },
      { status: false }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Storage Deleted Successfully" });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("delete storage error", error);
    next(error);
  }
};

export const setdefaultStorage = async (req, res, next) => {
  try {
    if (!req.body.id)
      return res
        .status(STATUS_CODE.success)
        .json({ success: false, message: "Required Storage Id." });
    const response = await service.setDefaultStorage(req.body.id);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("ERROR >>", error);
    next(error);
  }
};
