import { STATUS_CODE } from "../../config/constant.js";
import {
  addWallpaperSchema,
  editWallpaperSchema,
  addWallpaperCategorySchema,
  editWallpaperCategorySchema,
} from "../../validation/admin.js";
import * as service from "../../models/wallpaper.js";
import { deleteFile } from "../../models/filemanager.js";

export const backgroundPage = (req, res) => res.render("wallpaper");
export const addWallpaperPage = (req, res) => {
  res.locals.id = req.query.id;
  return res.render("addWallpaper");
};

export const addWallpaper = async (req, res, next) => {
  try {
    const { error } = addWallpaperSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    const response = await service.addWallpaper(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const wallpaper = async (req, res, next) => {
  try {
    const response = await service.backgrounds(null, req.query.category);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteWallpaper = async (req, res, next) => {
  try {
    if (!req.body.id)
      return { success: false, message: "Required wallpaper id." };
    const response = await service.updateWallpaperDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    response.success && deleteFile(response.data.media);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const editWallpaper = async (req, res) => {
  try {
    if (!req.query.id) return res.redirect("/wallpaper");
    const respnose = await service.backgrounds(req.query.id);
    if (respnose.success && respnose.data.length)
      return res.render("editWallpaper", { data: respnose.data[0] });
    return res.redirect("/wallpaper");
  } catch (error) {
    return res.redirect("/wallpaper");
  }
};

export const editWallpaperPost = async (req, res, next) => {
  try {
    const { error } = editWallpaperSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const update = {
      $set: req.body,
    };
    !req.body.endDate && (update["$unset"] = { endDate: "" });
    const response = await service.updateWallpaperDetails(
      {
        _id: req.body.id,
      },
      update
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

export const addWallpaperCategoryPage = async (req, res) => {
  res.render("addWallpaperCategory");
};

export const addWallpaperCategory = async (req, res, next) => {
  try {
    const { error } = addWallpaperCategorySchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await service.addWallpaperCategory(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const getWallpaperCategory = async (req, res, next) => {
  try {
    const response = await service.getWallpaperCategory();
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteWallpaperCategory = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Category Id" });
    }
    const response = await service.updateWallpaperCategory(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);
    const wallpapaers = await service.wallpaper({
      category: response.data._id,
      status: true,
    });
    if (!wallpapaers.success) {
      return res.status(STATUS_CODE.bad_request).json(wallpapaers);
    }
    deleteFile(response.data.media);
    for (let wallpaper of wallpapaers.data) {
      const response = await service.updateWallpaperDetails(
        { _id: wallpaper._id, status: true },
        { status: false }
      );
      response.success && deleteFile(wallpaper.media);
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const editWallpaperCategory = async (req, res) => {
  try {
    if (!req.query.id) return res.redirect("/wallpaper");
    const response = await service.getWallpaperCategory(req.query.id);
    if (!response.success) {
      return res.redirect("/wallpaper");
    }
    return res.render("editWallpaperCategory", { data: response.data[0] });
  } catch (error) {
    console.log("error while edit wallpaper");
    return res.redirect("/wallpapaer");
  }
};

export const editWallpaperCategoryPost = async (req, res, next) => {
  try {
    const { error } = editWallpaperCategorySchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const update = {
      $set: req.body,
    };
    !req.body.endDate && (update["$unset"] = { endDate: "" });
    const response = await service.updateWallpaperCategory(
      { _id: req.body.id, status: true },
      update
    );
    if (response.success) {
      if (req.body.media) deleteFile(response.data.media);
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const wallpaperManage = async (req, res) => {
  try {
    if (!req.query.id) return res.redirect("/wallpaper");
    res.locals.id = req.query.id;
    return res.render("wallpaperManage");
  } catch (error) {
    return res.redirect("/wallpaper");
  }
};
