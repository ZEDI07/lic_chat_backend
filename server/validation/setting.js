import Joi from "joi";
import { ONLINE_PRIVACY, PRIVACY_STATUS } from "../config/constant.js";

export const privacySetting = (data) => {
  const schema = Joi.object({
    lastSeen: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    online: Joi.number().valid(...Object.values(ONLINE_PRIVACY)),
    profilePhoto: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    about: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    group: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    status: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    call: Joi.number().valid(
      ...Object.values(PRIVACY_STATUS)
    ),
    readRecipts: Joi.boolean(),
    screenLock: Joi.object({
      touchId: Joi.boolean(),
      screenLockTime: Joi.number(),
    }),
  });
  return schema.validate(data);
};

export const notificationSetting = (data) => {
  const schema = Joi.object({
    conversationTone: Joi.boolean(),
    message: Joi.object({
      showNotification: Joi.boolean(),
      sound: Joi.string(),
      reactionNotification: Joi.boolean(),
    }),
    group: Joi.object({
      showNotification: Joi.boolean(),
      sound: Joi.string(),
      reactionNotification: Joi.boolean(),
    }),
    showPreview: Joi.boolean(),
  });
  return schema.validate(data);
};
