import Joi from "joi";
import { RECEIVER_TYPE, USER_ACTION } from "../config/constant.js";

export const initiateCall = (data) => {
  const schema = Joi.object({
    receiver: Joi.string().required(),
    callType: Joi.string().required(),
    receiverType: Joi.string()
      .valid(RECEIVER_TYPE.user, RECEIVER_TYPE.group)
      .required(),
  });
  return schema.validate(data);
};

export const messageSeen = (data) => {
  const schema = Joi.object({
    chat: Joi.string().required(),
    receiverType: Joi.string()
      .valid(RECEIVER_TYPE.user, RECEIVER_TYPE.group)
      .required(),
  });
  return schema.validate(data);
};

export const userAction = (data) => {
  const schema = Joi.object({
    action: Joi.string()
      .valid(USER_ACTION.typing, USER_ACTION.audio_record)
      .required(),
    chat: Joi.string().required(),
    receiverType: Joi.string()
      .valid(RECEIVER_TYPE.user, RECEIVER_TYPE.group)
      .required(),
  });
  return schema.validate(data);
};

export const locationUpdate = (data) => {
  const schema = Joi.object({
    chat: Joi.string().required(),
    message: Joi.string().required(),
    receiverType: Joi.string()
      .valid(RECEIVER_TYPE.user, RECEIVER_TYPE.group)
      .required(),
    coordinates: Joi.array().items(Joi.number().required()),
  });
  return schema.validate(data);
};

export const muteData = (data) => {
  const schema = Joi.object({
    menu: Joi.object().required(),
    chat: Joi.string().required(),
  });
  return schema.validate(data);
};
