import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { SERVER_URL } from "../config/index.js";
import adminModel from "./schema/user.js";
import { genrateJwtToken } from "../utils/common.js";
import { sendMail } from "../utils/mail.js";
import { ROLE_CODE } from "../config/constant.js";

export const login = async (req) => {
  try {
    const user = await adminModel.findOne({
      email: req.body.email,
      role: ROLE_CODE.superadmin,
    });
    if (!user) {
      return { success: false, message: "Invalid Credentials" };
    }
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return { success: false, message: "Invalid Credentials" };
    }
    const token = genrateJwtToken({ _id: user._id, password: user.password });
    req.session.auth = true;
    req.session.token = token;
    return { success: true, message: "Login Successfull" ,token};
  } catch (error) {
    console.log("Error while admin login", error);
    return { success: false, message: "Unkown Error.." };
  }
};

export const forgetPassword = async (data) => {
  try {
    const user = await adminModel.findOne({ email: data.email });
    if (!user) {
      return { success: false, message: "User not found." };
    }
    const token = uuidv4();
    user.token = token;
    // await user.save();
    const link = `${SERVER_URL}/create-new-password?id=${user._id}&token=${token}`;
    const content = {
      to: user.email,
      subject: "Reset Password Link",
      body: `Link for reset Password ${link}`,
    };
    const response = await sendMail(content);
    if (response.success) {
      return { success: true, message: "Reset Link sended successfully" };
    } else {
      return { success: false, message: "Error while sending reset mail." };
    }
  } catch (error) {
    console.log("Error while admin login", error);
    return { success: false, message: "Unkown Error.." };
  }
};

export const adminDetails = async (id) => {
  try {
    const user = await adminModel.findOne({ _id: id });
    return { success: true, data: user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
