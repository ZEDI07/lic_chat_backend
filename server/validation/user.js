import Joi from "joi";
import joiObjectid from "joi-objectid";
import { REPORT_TYPE } from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const registrationSchema = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    number: Joi.string(),
    status: Joi.boolean(),
    address: Joi.string(),
    dob: Joi.date(),
    password: Joi.string().min(5),
    uid: Joi.number().required(),
    avatar: Joi.string(),
    link: Joi.string(),
    level_id: Joi.string(),
    timezone: Joi.string(),
    gender: Joi.string().allow(""),
    language: Joi.string(),
    about: Joi.string().allow(""),
    first_name: Joi.string().allow(""),
    last_name: Joi.string().allow(""),
    dob: Joi.date().allow(""),
  });
  return schema.validate(data);
};

export const loginSchema = (data) => {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  return schema.validate(data);
};

export const updateDetails = (data) => {
  const schema = Joi.object({
    uid: Joi.number().required(),
    name: Joi.string().allow(""),
    avatar: Joi.string().allow(""),
    link: Joi.string().allow(""),
    level_id: Joi.number().allow(""),
    timezone: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    gender: Joi.string().allow(""),
    language: Joi.string().allow(""),
    about: Joi.string().allow(""),
    first_name: Joi.string().allow(""),
    last_name: Joi.string().allow(""),
    dob: Joi.date().allow(""),
  });
  return schema.validate(data);
};

export const xApiUpdateDetails = (data) => {
  const schema = Joi.object({
    name: Joi.string().allow(""),
    avatar: Joi.string().uri().allow(""),
    link: Joi.string().uri().allow(""),
    level_id: Joi.number().allow(""),
    timezone: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    gender: Joi.string().allow(""),
    language: Joi.string().allow(""),
    about: Joi.string().allow(""),
    first_name: Joi.string().allow(""),
    last_name: Joi.string().allow(""),
  });
  return schema.validate(data);
};

export const loginUID = (data) => {
  const schema = Joi.object({
    uid: Joi.alternatives().try(Joi.number(), Joi.string().hex()),
    _id: Joi.string().hex()
  }).or('uid', '_id');
  return schema.validate(data);
};

export const reportSchema = (data) => {
  const schema = Joi.object({
    report: Joi.ObjectId().required(),
    reportType: Joi.number()
      .valid(...Object.values(REPORT_TYPE))
      .required(),
    block: Joi.alternatives().conditional("reportType", {
      is: REPORT_TYPE.user,
      then: Joi.boolean().required(),
      otherwise: Joi.boolean(),
    }),
    leave: Joi.alternatives().conditional("reportType", {
      is: REPORT_TYPE.group,
      then: Joi.boolean().required(),
      otherwise: Joi.boolean(),
    }),
  });
  return schema.validate(data);
};

export const editProfile = (data) => {
  const schema = Joi.object({
    name: Joi.string(),
    metadata: Joi.string().allow(""),
    about: Joi.string().allow(""),
    avatar: Joi.string().uri(),
  });
  return schema.validate(data);
};

export const updatePushNotification = (data) => {
  const schema = Joi.object({
    id: Joi.string(),
    token: Joi.string().required(),
  });
  return schema.validate(data);
};

export const aboutSchema = (data) => {
  const schema = Joi.object({
    about: Joi.string().required(),
  }).required()
  return schema.validate(data);
};
