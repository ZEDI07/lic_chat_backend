import Joi from "joi";
import joiObjectid from "joi-objectid";
import { GROUP_TYPE, MEMBER_GROUP_ROLE } from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const createGroupPayload = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    metadata: Joi.string(),
    users: Joi.array().items(Joi.string().required()),
    // avatar: Joi.string(),
    about: Joi.string(),
    type: Joi.number()
      .valid(
        GROUP_TYPE.password_protected,
        GROUP_TYPE.private,
        GROUP_TYPE.public
      )
      .required(),
    password: Joi.alternatives().conditional("type", {
      is: GROUP_TYPE.password_protected,
      then: Joi.string().required(),
      otherwise: null,
    }),
  });
  return schema.validate(data);
};

export const validateGroupId = (data) => {
  const schema = Joi.object({
    group: Joi.string().required(),
  });
  return schema.validate(data);
};

export const addUser = (data) => {
  const schema = Joi.object({
    group: Joi.string().required(),
    users: Joi.array().items(Joi.string().required()),
  });
  return schema.validate(data);
};

export const removeUserPayload = (data) => {
  const schema = Joi.object({
    group: Joi.string().required(),
    user: Joi.string().required(),
  });
  return schema.validate(data);
};

export const editPayload = (data) => {
  const schema = Joi.object({
    group: Joi.string().required(),
    name: Joi.string(),
    metadata: Joi.string(),
    about: Joi.string(),
    avatar: Joi.string(),
  });
  return schema.validate(data);
};

export const groupSetting = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    settings: Joi.object({
      member: {
        editDetails: Joi.boolean().required(),
        sendMessage: Joi.boolean().required(),
        addMember: Joi.boolean().required(),
        call: Joi.boolean().required()
      },
      admin: {
        approveMember: Joi.boolean().required(),
      },
    }),
  });
  return schema.validate(data);
};

export const editPending = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    user: Joi.ObjectId().required(),
    accept: Joi.boolean().required(),
  });
  return schema.validate(data);
};

export const reqToGroup = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    link: Joi.string().required(),
  });
  return schema.validate(data);
};

export const groupId = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const validateVerifyPass = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

export const changePassVerify = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    password: Joi.string().required(),
    email: Joi.string().required(),
    otp: Joi.string().required(),
  });
  return schema.validate(data);
};

export const groupForgetPassword = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    email: Joi.string().required(),
  });
  return schema.validate(data);
};

export const changeMemberRole = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    member: Joi.ObjectId().required(),
    role: Joi.number()
      .valid(MEMBER_GROUP_ROLE.admin, MEMBER_GROUP_ROLE.member)
      .required(),
  });
  return schema.validate(data);
};
