import fs from "fs";
import i18next from "i18next";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { STATUS_CODE } from "../../config/constant.js";
import * as services from "../../models/language.js";
import {
  addLanguageSchema,
  updateLanguageSchema,
} from "../../validation/admin.js";

const currDir = dirname(fileURLToPath(import.meta.url));
const getLocaleFilePath = (locale, folderonly) => {
  if (folderonly) return path.join(currDir, `../../locales/${locale}`);
  else return path.join(currDir, `../../locales/${locale}/common.json`);
};

export const language = (req, res) => {
  res.render("language");
};

export const addLanguagePage = (req, res) => {
  res.render("addLanguage");
};

export const addLanguage = async (req, res, next) => {
  try {
    const { error } = addLanguageSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const isExists = await services.getLanguage({
      key: req.body.key,
      status: true,
    });
    if (isExists.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Language already added." });
    }
    if (req.body.key !== "en") {
      fs.mkdirSync(getLocaleFilePath(req.body.key, true), {
        recursive: true,
      });
      const data = JSON.parse(fs.readFileSync(getLocaleFilePath("en")));
      for (let key in data) {
        data[key] = "";
      }
      fs.writeFileSync(
        getLocaleFilePath(req.body.key, false),
        JSON.stringify(data)
      );
    }
    const response = await services.addLanguage(req.body);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error >>", error);
    next(error);
  }
};

export const getAllconfigLanguage = async (req, res, next) => {
  try {
    const response = await services.allLanguages();
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const setDefault = async (req, res, next) => {
  try {
    if (!req.body.id)
      return res
        .status(STATUS_CODE.success)
        .json({ success: false, message: "Required Storage Id." });
    const response = await services.setDefaultStorage(req.body.id);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("ERROR >>", error);
    next(error);
  }
};

export const editLanguagePage = async (req, res) => {
  res.locals.id = req.query.id;
  return res.render("editLanguage");
};

export const editLanguage = async (req, res, next) => {
  try {
    let { id, page, limit, search } = req.query;
    page = +page || 0;
    limit = +limit || 20;
    if (!req.query.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required id." });
    }
    const language = await services.getLanguage({
      _id: id,
      status: true,
    });
    if (!language.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: true, message: "Language Configuration not found." });
    }
    const mainFile = getLocaleFilePath("en")
    const filePath = getLocaleFilePath(language.data.key);
    const existFile = fs.existsSync(filePath);
    if (!existFile) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "something went wrong" });
    }
    const keywords = JSON.parse(fs.readFileSync(mainFile))
    let data = Object.entries({ ...keywords, ...JSON.parse(fs.readFileSync(filePath)) });
    if (search) {
      data = data.filter((ele) => ele[0].toLowerCase().includes(search.toLowerCase()));
    }
    const skip = page * limit;
    const size = skip + limit;
    const count = data.length;
    const pageData = [];
    for (let value = skip; value < (count > size ? size : count); value++) {
      pageData.push(data[value]);
    }

    return res.status(STATUS_CODE.success).json({
      success: true,
      language: language.data,
      data: pageData,
      count: count,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLanguage = async (req, res, next) => {
  try {
    const { error } = updateLanguageSchema(req.body);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    const languageDetails = await services.getLanguage({
      _id: req.body.id,
      status: true,
    });
    if (!languageDetails.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Language details not found" });
    }
    const filePath = getLocaleFilePath(languageDetails.data.key);
    const existFile = fs.existsSync(filePath);
    if (!existFile) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "something went wrong" });
    }
    let data = JSON.parse(fs.readFileSync(filePath));
    data = { ...data, ...req.body.languageData };
    fs.writeFileSync(filePath, JSON.stringify(data));
    i18next.reloadResources();
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Translation saved successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteLanguage = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required Id" });
    }
    const languageDetails = await services.getLanguage({
      _id: req.body.id,
      status: true,
    });
    if (!languageDetails.success) {
      return res.status(STATUS_CODE.success).json(languageDetails);
    }
    languageDetails.data.key !== "en" &&
      fs.rmSync(getLocaleFilePath(languageDetails.data.key, true), {
        recursive: true,
      });
    const updateLanguageDetails = await services.updateLanguage(
      {
        _id: req.body.id,
        status: true,
      },
      { status: false }
    );
    if (!updateLanguageDetails.success) {
      return res.status(STATUS_CODE.bad_request).json(updateLanguageDetails);
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Language Deleted Successfully" });
  } catch (error) {
    next(error);
  }
};
