import Joi from "joi";
import joiObjectid from "joi-objectid";
import { CALL_TYPE, RECEIVER_TYPE } from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const callIdValidation = (data) => {
  const schema = Joi.object({
    calls: Joi.array().items(Joi.string().required()).required(),
  });
  return schema.validate(data);
};

export const initiateCall = (data) => {
  const schema = Joi.object({
    receiver: Joi.ObjectId().required(),
    receiverType: Joi.string().valid(...Object.values(RECEIVER_TYPE)).required(),
    callType: Joi.string().valid(...Object.values(CALL_TYPE)).required(),
    members: Joi.array().items(Joi.ObjectId().required()).max(29)
  })
  return schema.validate(data)
}