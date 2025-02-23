import { SHOW_STORIES, STORIES_CONTENT_TYPE } from "../config/constant.js";
import Joi from "joi";

export const storyPayload = (data) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid(...Object.values(STORIES_CONTENT_TYPE))
      .required(),
    text: Joi.alternatives().conditional("type", {
      is: STORIES_CONTENT_TYPE.text,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.string().trim().min(1),
    }),
    show: Joi.string()
      .valid(...Object.values(SHOW_STORIES))
      .required(),
  });
  return schema.validate(data);
};

export const storyIdValidation = (data) => {
  const schema = Joi.object({
    story: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};
