import Joi from "joi";
import joiObjectid from "joi-objectid";
import {
  CONTENT_TYPE,
  FRIENDSHIP_STATUS,
  GENERAL_SETTING_KEY,
  GROUP_TYPE,
  MESSAGING_SETTING,
  ROLE_CODE,
  STORAGE_TYPE,
  USER_STATUS,
} from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const loginSchema = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return schema.validate(data);
};

export const forgetPasswordSchema = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  return schema.validate(data);
};

export const updateUserStatusSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    status: Joi.number()
      .valid(...Object.values(USER_STATUS))
      .required(),
  });
  return schema.validate(data);
};

export const updateMessageSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId(),
    deleted: Joi.boolean(),
  });
  return schema.validate(data);
};

export const addUserSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    role: Joi.string()
      .valid(...Object.values(ROLE_CODE))
      .required(),
    uid: Joi.number().min(1).required(),
    avatar: Joi.string().allow(""),
    link: Joi.string().allow(""),
    metadata: Joi.string().allow(""),
  }).unknown(true);
  return schema.validate(data);
};

export const updateUserDetails = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    role: Joi.number().required(),
    avatar: Joi.string().required(),
    link: Joi.string().allow(""),
    metadata: Joi.string().allow(""),
  });
  return schema.validate(data);
};

export const groupAddSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    avatar: Joi.string().required(),
    type: Joi.number()
      .allow(...Object.values(GROUP_TYPE))
      .required(),
    link: Joi.string().allow(""),
    metadata: Joi.string().allow(""),
  });
  return schema.validate(data);
};

export const getGroupList = (data) => {
  const schema = Joi.object({
    page: Joi.number().required(),
    limit: Joi.number().required(),
    status: Joi.boolean().required(),
  });
  return schema.validate(data);
};

export const groupUserList = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    page: Joi.number().required(),
    limit: Joi.number().required(),
    status: Joi.number()
      .valid(USER_STATUS.active, USER_STATUS.inactive)
      .required(),
  });
  return schema.validate(data);
};

export const updateGroupUserStatus = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    user: Joi.ObjectId().required(),
    status: Joi.number()
      .valid(USER_STATUS.active, USER_STATUS.inactive, USER_STATUS.deleted)
      .required(),
  });
  return schema.validate(data);
};

export const groupEditSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    avatar: Joi.string().required(),
    type: Joi.number()
      .allow(
        GROUP_TYPE.private,
        GROUP_TYPE.public,
        GROUP_TYPE.password_protected
      )
      .required(),
    link: Joi.string(),
    metadata: Joi.string(),
  });
  return schema.validate(data);
};

export const searchSchema = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId(),
    key: Joi.string().valid("name", "uid", "email").required(),
    value: Joi.string().required(),
    status: Joi.number()
      .valid(USER_STATUS.active, USER_STATUS.inactive)
      .required(),
    page: Joi.number().required(),
    limit: Joi.number().required(),
  });
  return schema.validate(data);
};

export const addGroupUser = (data) => {
  const schema = Joi.object({
    group: Joi.ObjectId().required(),
    users: Joi.array().items(Joi.string().required()).required(),
  });
  return schema.validate(data);
};

export const addUserFriends = (data) => {
  const schema = Joi.object({
    user: Joi.ObjectId().required(),
    users: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};

export const updateFriendStatus = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    user: Joi.ObjectId().required(),
    status: Joi.number().valid(FRIENDSHIP_STATUS.unfriend).required(),
  });
  return schema.validate(data);
};

export const roleAdd = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    roleId: Joi.string().required(),
    description: Joi.string().required(),
  });
  return schema.validate(data);
};

export const getRoles = (data) => {
  const schema = Joi.object({
    key: Joi.string().valid("name"),
    value: Joi.string(),
    page: Joi.number().required(),
    limit: Joi.number().required(),
  });
  return schema.validate(data);
};

export const roleEditPost = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string(),
    description: Joi.string(),
  });
  return schema.validate(data);
};

export const updateRoleData = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    status: Joi.boolean().required(),
  });
  return schema.validate(data);
};

export const changeRolePermission = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    permissionKey: Joi.string().required(),
    status: Joi.boolean().required(),
  });
  return schema.validate(data);
};

export const getFile = (data) => {
  const schema = Joi.object({
    key: Joi.string().valid("originalname"),
    value: Joi.string(),
    page: Joi.number().required(),
    limit: Joi.number().required(),
    type: Joi.string(),
    selectedDate: Joi.number().valid(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),
  });
  return schema.validate(data);
};

export const updateFileStatus = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    status: Joi.boolean().valid(false).required(),
  });
  return schema.validate(data);
};

export const addUserGroup = (data) => {
  const schema = Joi.object({
    user: Joi.ObjectId().required(),
    groups: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};

export const configStorageSetting = (data) => {
  const schema = Joi.object({
    storage: Joi.string()
      .valid(
        STORAGE_TYPE.amazon_s3,
        STORAGE_TYPE.amazon_s3_compatible_storage,
        STORAGE_TYPE.digital_ocean_space,
        STORAGE_TYPE.local_storage,
        STORAGE_TYPE.virtual_file_system,
        STORAGE_TYPE.wasabi_cloud_storage
      )
      .required(),
    enabled: Joi.boolean().required(),
    credentials: Joi.alternatives()
      .conditional("storage", {
        is: STORAGE_TYPE.local_storage,
        then: Joi.boolean().allow(null),
      })
      .conditional("storage", {
        is: STORAGE_TYPE.virtual_file_system,
        then: Joi.object({
          remoteHost: Joi.string().required(),
          remotePort: Joi.number().required(),
          username: Joi.string().required(),
          password: Joi.string().required(),
          path: Joi.string().required(),
          cdn_url: Joi.string().required(),
        }),
        otherwise: Joi.object({
          accessKeyId: Joi.string().required(),
          secretAccessKey: Joi.string().required(),
          region: Joi.string().required(),
          bucket: Joi.string().required(),
          cdn_url: Joi.alternatives().conditional("...storage", {
            is: STORAGE_TYPE.amazon_s3_compatible_storage,
            then: Joi.string().required(),
            otherwise: Joi.string(),
          }),
          endpoint_url: Joi.alternatives().conditional("...storage", {
            is: STORAGE_TYPE.amazon_s3_compatible_storage,
            then: Joi.string().required(),
          }),
        }).required(),
      }),
  });
  return schema.validate(data);
};

export const updateStorageSetting = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    storage: Joi.string().required(),
    enabled: Joi.boolean().required(),
    credentials: Joi.object({
      remoteHost: Joi.string(),
      remotePort: Joi.number(),
      username: Joi.string(),
      password: Joi.string(),
      path: Joi.string(),
      cdn_url: Joi.string(),
      accessKeyId: Joi.string(),
      secretAccessKey: Joi.string(),
      region: Joi.string(),
      bucket: Joi.string(),
      cdn_url: Joi.string(),
      endpoint_url: Joi.string(),
    }).allow(null),
  });
  return schema.validate(data);
};

export const deleteGroup = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    status: Joi.boolean().valid(false).required(),
  });
  return schema.validate(data);
};

export const addReactionSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    media: Joi.string().required(),
  });
  return schema.validate(data);
};

export const editReactionSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    media: Joi.string().allow(""),
  });
  return schema.validate(data);
};

export const addStickerCategorySchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    color: Joi.string().required(),
    media: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const editStickerCategorySchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    color: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    media: Joi.ObjectId(),
  });
  return schema.validate(data);
};

export const addStickerPackSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    media: Joi.ObjectId().required(),
    category: Joi.string().required(),
    description: Joi.string(),
  });
  return schema.validate(data);
};

export const editStickerPackSchema = (data) => {
  const schema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    media: Joi.ObjectId(),
    category: Joi.string().required(),
    description: Joi.string().allow(""),
  });
  return schema.validate(data);
};

export const addStickerSchema = (data) => {
  const schema = Joi.object({
    media: Joi.ObjectId().required(),
    // category: Joi.string().required(),
    pack: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const editStickerSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    pack: Joi.ObjectId().required(),
    category: Joi.array().items(Joi.ObjectId().required()),
    media: Joi.ObjectId(),
  });
  return schema.validate(data);
};

export const addWallpaperSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    media: Joi.ObjectId().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    category: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const editWallpaperSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    media: Joi.ObjectId(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
  });
  return schema.validate(data);
};

export const stickerSearchSchema = (data) => {
  const schema = Joi.object({
    key: Joi.string().valid("name").required(),
    value: Joi.string().required(),
    tab: Joi.number().valid(1, 2).required(),
  });
  return schema.validate(data);
};

export const addLanguageSchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    key: Joi.string().required(),
  });
  return schema.validate(data);
};

export const updateLanguageSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    languageData: Joi.object().required(),
  });
  return schema.validate(data);
};

export const addWallpaperCategorySchema = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    color: Joi.string().required(),
    media: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const editWallpaperCategorySchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
    name: Joi.string().required(),
    color: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    media: Joi.ObjectId(),
  });
  return schema.validate(data);
};

export const updateCredentialSchema = (data) => {
  const schema = Joi.object({
    id: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const generalSettingSchema = (data) => {
  const schema = Joi.object({
    quality: Joi.number(),
    messaging_setting: Joi.number().valid(...Object.values(MESSAGING_SETTING)),
    domain: Joi.string(),
    agora: Joi.object({
      id: Joi.string().allow("")
    }),
    auto_delete_attachment: Joi.object({
      status: Joi.boolean(),
      day: Joi.number(),
      contentType: Joi.array().items()
    }),
    group: Joi.object({
      enabled: Joi.boolean().required()
    }),
    // width: Joi.number().required(),
    // videoSize: {
    //   size: Joi.number().required(),
    //   fps: Joi.number().required(),
    // },
  });
  return schema.validate(data);
};

export const pushNotificationSchema = (data) => {
  const schema = Joi.object({
    oneSignal: Joi.object({
      id: Joi.string().required(),
      key: Joi.string().required(),
    }),
  });
  return schema.validate(data);
};

export const getGeneralSettingSchema = (data) => {
  const schema = Joi.object({
    key: Joi.string()
      .valid(...Object.values(GENERAL_SETTING_KEY))
      .required(),
  });
  return schema.validate(data);
};

export const setup = (data) => {
  const schema = Joi.object({
    domain: Joi.string().required(),
    agora: Joi.boolean().required(),
    password: Joi.string().required()
  });
  return schema.validate(data)
}