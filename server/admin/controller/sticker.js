import { STATUS_CODE } from "../../config/constant.js";
import { deleteFile } from "../../models/filemanager.js";
import * as services from "../../models/sticker.js";
import {
  addStickerCategorySchema,
  addStickerPackSchema,
  editStickerCategorySchema,
  editStickerPackSchema,
  addStickerSchema,
  editStickerSchema,
  stickerSearchSchema,
} from "../../validation/admin.js";

export const stickerPage = (req, res) => {
  return res.render("sticker");
};

export const stickerAddCategoryPage = (req, res) => {
  return res.render("addStickerCategory");
};

export const addStickerCategory = async (req, res, next) => {
  try {
    const { error } = addStickerCategorySchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.addStickerCategory(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const getStickerCategory = async (req, res, next) => {
  try {
    const response = await services.getStickerCategory();
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const editStickerCategory = async (req, res) => {
  try {
    if (!req.query.id) res.redirect("/sticker");
    const response = await services.getStickerCategory(req.query.id);
    if (response.success)
      return res.render("editStickerCategory", { data: response.data[0] });
    return res.redirect("/sticker");
  } catch (error) {
    return res.redirect("/sticker");
  }
};

export const editStickerCategoryPost = async (req, res, next) => {
  try {
    const { error } = editStickerCategorySchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const update = {
      $set: req.body,
    };
    !req.body.endDate && (update["$unset"] = { endDate: "" });
    const response = await services.stickerCategoryUpdateDetails(
      { _id: req.body.id, status: true },
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

export const deleteStickerCategory = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Sticker Category Id." });
    }
    const response = await services.stickerCategoryUpdateDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);
    deleteFile(response.data.media);
    const stickerPacks = await services.packs({
      category: response.data._id,
      status: true,
    });
    if (!stickerPacks.success)
      return res.status(STATUS_CODE.bad_request).json(stickerPacks);
    for (let pack of stickerPacks.data) {
      const response = await services.updateStickerPackDetails(
        { _id: pack._id },
        { status: false }
      );
      response.success && deleteFile(response.data.media);
      const stickers = await services.stickers({
        pack: pack._id,
        status: true,
      });
      for (let sticker of stickers.data) {
        const response = await services.updateStickerDetails(
          { _id: sticker._id },
          { status: false }
        );
        response.success && deleteFile(response.data.media);
      }
    }
    if (response.success) return res.status(STATUS_CODE.success).json(response);
  } catch (error) {
    next(error);
  }
};

export const stickerAddPackPage = async (req, res) => {
  try {
    const response = await services.getStickerCategory();
    if (response.success)
      return res.render("addStickerPack", { categories: response.data });
    return res.redirect("/sticker");
  } catch (error) {
    return res.redirect("/sticker");
  }
};

export const addStickerPack = async (req, res, next) => {
  try {
    const { error } = addStickerPackSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    const response = await services.addStickerPack(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const getStickerPacks = async (req, res, next) => {
  try {
    const response = await services.getAllStickerPack();
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteStickerPack = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Sticker Pack id." });
    }
    const response = await services.updateStickerPackDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (!response.success)
      return res.status(STATUS_CODE.bad_request).json(response);
    const stickers = await services.stickers({
      pack: response.data._id,
      status: true,
    });
    if (!stickers.success)
      return res.status(STATUS_CODE.bad_request).json(stickers);
    for (let sticker of stickers.data) {
      const response = await services.updateStickerDetails(
        { _id: sticker._id },
        { status: false }
      );
      response.success && deleteFile(response.data.media);
    }
    if (response.success) return res.status(STATUS_CODE.success).json(response);
  } catch (error) {
    next(error);
  }
};

export const editStickerPack = async (req, res) => {
  try {
    if (!req.query.id) {
      return res.redirect("/sticker#sticker-pack");
    }
    const response = await services.getAllStickerPack(req.query.id);
    if (response.success && response.data.length) {
      const categories = await services.getStickerCategory();
      if (categories.success)
        return res.render("editStickerPack", {
          data: response.data[0],
          categories: categories.data,
        });
    }
    return res.redirect("/sticker#sticker-pack");
  } catch (error) {
    return res.redirect("/sticker#sticker-pack");
  }
};

export const editStickerPackPost = async (req, res, next) => {
  try {
    const { error } = editStickerPackSchema(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    const response = await services.updateStickerPackDetails(
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

export const manageStickers = async (req, res) => {
  if (req.query.id) {
    res.locals.id = req.query.id;
  }
  return res.render("stickerManage");
};

export const stickerAddPage = async (req, res) => {
  try {
    res.locals.id = null;
    const response = await services.getStickerCategory();
    if (req.query.id) res.locals.id = req.query.id;
    if (response.success)
      return res.render("stickerAdd", { categories: response.data });
  } catch (error) {
    return res.redirect(`/sticker-pack-manage?id=${req.query.id}`);
  }
};

export const addsticker = async (req, res, next) => {
  try {
    const { error } = addStickerSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.addSticker(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const sticker = async (req, res, next) => {
  try {
    if (!req.query.id) return res.redirect("/sticker#sticker-pack");
    const response = await services.getStickers(
      { pack: req.query.id },
      { categoryDetails: true }
    );
    if (response.success) {
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteSticker = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Sticker Id." });
    }
    const response = await services.updateStickerDetails(
      { _id: req.body.id, status: true },
      { status: false }
    );
    if (response.success) {
      deleteFile(response.data.media);
      return res.status(STATUS_CODE.success).json(response);
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const editStickerPage = async (req, res) => {
  try {
    const { id, packId } = req.query;
    res.locals.packId = packId;
    const [stickerDetail, categories, packs] = await Promise.all([
      services.getStickers({ id }),
      services.getStickerCategory(),
      services.getAllStickerPack(),
    ]);
    if (
      stickerDetail.success &&
      stickerDetail.data.length &&
      categories.success &&
      packs.success
    )
      return res.render("editSticker", {
        data: stickerDetail.data[0],
        categories: categories.data,
        packs: packs.data,
      });
    return res.redirect(`/sticker-pack-manage?id=${packId}`);
  } catch (error) {
    console.log("error >>", error);
  }
};

export const editSticker = async (req, res, next) => {
  try {
    const { error } = editStickerSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const response = await services.updateStickerDetails(
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

export const search = async (req, res, next) => {
  try {
    const { error } = stickerSearchSchema(req.query);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    const { tab } = req.query;
    if (tab == 1) {
      const response = await services.getStickerCategory(null, req.query);
      if (response.success) {
        return res.status(STATUS_CODE.success).json(response);
      }
      return res.status(STATUS_CODE.bad_request).json(response);
    } else if (tab == 2) {
      const response = await services.getAllStickerPack(null, req.query);
      if (response.success) {
        return res.status(STATUS_CODE.success).json(response);
      }
      return res.status(STATUS_CODE.bad_request).json(response);
    }
  } catch (error) {
    next(error);
  }
};
