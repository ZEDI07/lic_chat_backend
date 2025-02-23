import Joi from "joi";
import joiObjectid from "joi-objectid";
Joi.ObjectId = joiObjectid(Joi);

export const friendIdValidate = (data) => {
  const schema = Joi.object({
    friend: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const friendsIdValidate = (data) => {
  const schema = Joi.object({
    friends: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};
