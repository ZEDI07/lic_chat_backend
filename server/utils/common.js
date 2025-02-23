import jwt from "jsonwebtoken";
import { DEBUG_LOG, SECRET_KEY } from "../config/index.js";

export const genrateJwtToken = (data) => jwt.sign(data, SECRET_KEY);

export const decodeJwtToken = (token) => {
  try {
    return { success: true, data: jwt.verify(token, SECRET_KEY) };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getUploadFileUrl = (type = "media") => {
  const date = new Date();
  return `uploads/${type}/${date.getFullYear()}/${date.getMonth() + 1
    }/${date.getDate()}`;
};

export const debugLog = (message, log) => {
  if (DEBUG_LOG) {
    console.log("\n STARTED >>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log("\t", message, log);
    console.log("ENDED XXXXXXXXXXXXXXXXXXXXXXXXXXX \n");
  }
};


export function flattenObj(obj, parentkey) {
  const update = {};
  function flatObj(obj, parentkey) {
    for (let key in obj) {
      const objkey = `${parentkey}.${key}`;
      if (typeof obj[key] === "object" && Array.isArray(obj[key]) === false) {
        flatObj(obj[key], objkey);
      } else {
        update[objkey] = obj[key];
      }
    }
  }
  flatObj(obj, parentkey)
  return update;
}

export const generateOTP = () => Math.floor(Math.random() * 9000 + 1000);
