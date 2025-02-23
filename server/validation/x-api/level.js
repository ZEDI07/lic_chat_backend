import Joi from "joi";

export const levelSchema = (data) => {
  const schema = Joi.object({
    level_id: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string(),
  });
  return schema.validate(data);
};

export const updatelevelSchema = (data) => {
  const schema = Joi.object({
    title: Joi.string(),
    description: Joi.string(),
  });
  return schema.validate(data);
};
