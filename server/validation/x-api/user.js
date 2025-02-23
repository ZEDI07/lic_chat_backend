import Joi from "joi";

export const friendSchema = (data) => {
  const schema = Joi.object({
    friends: Joi.array().items(Joi.number().required()).required(),
  });
  return schema.validate(data);
};
