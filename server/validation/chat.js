import Joi from "joi";
import joiObjectid from "joi-objectid";
import { RECEIVER_TYPE } from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const moreSchema = (data) => {
  const schema = Joi.object({
    chatType: Joi.string()
      .valid(...Object.values(RECEIVER_TYPE))
      .required(),
    chatId: Joi.ObjectId().required(),
  }).unknown(true);
  return schema.validate(data);
};

export const chatWallpaperValidation = (data) => {
  const schema = Joi.object({
    chat: Joi.ObjectId().required(),
    wallpaper: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const wallpaperValidation = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const categoryIdValidation = (data) => {
  const schema = Joi.object({
    categoryId: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const packIdValidation = (data) => {
  const schema = Joi.object({
    packId: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};
