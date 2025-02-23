import Joi from "joi";
import joiObjectid from "joi-objectid";
import {
  CONTENT_TYPE,
  LOCATION_TYPE,
  MUTE_DURATION,
  RECEIVER_TYPE,
  VIEW_MORE,
} from "../config/constant.js";
Joi.ObjectId = joiObjectid(Joi);

export const messagePayload = (data) => {
  const schema = Joi.object({
    refId: Joi.string(),
    to: Joi.ObjectId().required(),
    receiverType: Joi.string()
      .valid(...Object.values(RECEIVER_TYPE))
      .required(),
    type: Joi.string()
      .valid(...Object.values(CONTENT_TYPE))
      .required(),
    text: Joi.alternatives().conditional("type", {
      is: CONTENT_TYPE.text,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.string().trim().min(1),
    }),
    location: Joi.alternatives().conditional("type", {
      is: CONTENT_TYPE.location,
      then: Joi.object({
        live: Joi.boolean().required(),
        coordinates: Joi.array().items(Joi.number().required()),
        title: Joi.string(),
        subTitle: Joi.string(),
        duration: Joi.alternatives().conditional("live", {
          is: true,
          then: Joi.number().valid(15, 1, 8).required(),
          otherwise: null,
        }),
      }).required(),
    }),
    sticker: Joi.alternatives().conditional("type", {
      is: CONTENT_TYPE.sticker,
      then: Joi.ObjectId().required(),
      otherwise: null,
    }),
    contact: Joi.alternatives().conditional("type", {
      is: CONTENT_TYPE.contact,
      then: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            firstName: Joi.string(),
            lastName: Joi.string(),
            phoneNumbers: Joi.array().items(
              Joi.object({
                countryCode: Joi.string(),
                number: Joi.string().required(),
                digits: Joi.string(),
                label: Joi.string(),
              }).unknown(true)
            ),
            emails: Joi.array().items(
              Joi.object({
                email: Joi.string(),
                label: Joi.string()
              }).unknown(true)
            ),
          }).unknown(true)
        )
        .required(),
      otherwise: null,
    }),
    reply: Joi.ObjectId(),
    poll: Joi.alternatives().conditional("type", {
      is: CONTENT_TYPE.poll,
      then: Joi.object({
        question: Joi.string().required(),
        options: Joi.array()
          .items(
            Joi.object({
              text: Joi.string().required(),
            })
          )
          .required(),
        multiple: Joi.boolean().required(),
      }),
      otherwise: null,
    }),
    story: Joi.ObjectId(),
    mentions: Joi.array().items(
      Joi.object({
        _id: Joi.ObjectId().required(),
        name: Joi.string().required(),
      })
    ),
  });
  return schema.validate(data);
};

export const editMessagePayload = (data) => {
  const schema = Joi.object({
    message: Joi.ObjectId().required(),
    text: Joi.string().required(),
  });
  return schema.validate(data);
};

export const stopLiveLocationPayload = (data) => {
  const schema = Joi.object({
    messages: Joi.array().items(Joi.ObjectId().required()),
  });
  return schema.validate(data);
};

export const forwardMessagePayload = (data) => {
  const schema = Joi.object({
    messages: Joi.array().items(Joi.ObjectId().required()),
    users: Joi.array().items(
      Joi.object({
        to: Joi.ObjectId().required(),
        receiverType: Joi.string()
          .valid(...Object.values(RECEIVER_TYPE))
          .required(),
      }).required()
    ),
    text: Joi.string(),
  });
  return schema.validate(data);
};

export const validateMessageId = (data) => {
  const schema = Joi.object({
    chat: Joi.ObjectId().required(),
    messages: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};
export const validateStarMessageId = (data) => {
  const schema = Joi.object({
    messages: Joi.array().items(Joi.ObjectId().required()).required(),
    chat: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};
export const validateMessageDeleteMe = (data) => {
  const schema = Joi.object({
    chat: Joi.ObjectId().required(),
    messages: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};

export const validateMessage = (data) => {
  const schema = Joi.object({
    message: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const validateId = (data) => {
  const schema = Joi.object({ chat: Joi.ObjectId().required() });
  return schema.validate(data);
};

export const validateChatId = (data) => {
  const schema = Joi.object({
    chat: Joi.array().items(Joi.ObjectId().required()).required(),
  });
  return schema.validate(data);
};

export const validateMutePayload = (data) => {
  const schema = Joi.object({
    chat: Joi.array().items(Joi.ObjectId().required()).required(),
    duration: Joi.number()
      .valid(...Object.values(MUTE_DURATION))
      .required(),
  });
  return schema.validate(data);
};

export const deleteConversation = (data) => {
  const schema = Joi.array().items(
    Joi.object({
      chat: Joi.ObjectId().required(),
      chatType: Joi.string()
        .valid(...Object.values(RECEIVER_TYPE))
        .required(),
    })
  );
  return schema.validate(data);
};

export const reactionPayload = (data) => {
  const schema = Joi.object({
    message: Joi.ObjectId().required(),
    reaction: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const removeReactionPayload = (data) => {
  const schema = Joi.object({
    message: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const userId = (data) => {
  const schema = Joi.object({
    user: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const searchValid = (data) => {
  const schema = Joi.object({
    text: Joi.string(),
    type: Joi.string()
      .valid(...Object.keys(CONTENT_TYPE))
      .required(),
  });
  return schema.validate(data);
};

export const validateVote = (data) => {
  const schema = Joi.object({
    option: Joi.ObjectId().required(),
    message: Joi.ObjectId().required(),
    status: Joi.boolean().required(),
    poll: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const validatePoll = (data) => {
  const schema = Joi.object({
    poll: Joi.ObjectId().required(),
  });
  return schema.validate(data);
};

export const chatSearchValidation = (data) => {
  const schema = Joi.object({
    text: Joi.string(),
    media: Joi.string().valid(...Object.values(CONTENT_TYPE)),
    more: Joi.string().valid(...Object.values(VIEW_MORE)),
    lastMessage: Joi.ObjectId(),
    lastChat: Joi.number(),
  }).or("text", "media");
  return schema.validate(data);
};
