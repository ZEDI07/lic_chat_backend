import nodemailer from "nodemailer";
import {
  NODEMAILER_HOST,
  NODEMAILER_PASS,
  NODEMAILER_PORT,
  NODEMAILER_USER,
} from "../config/index.js";

let transporter = nodemailer.createTransport({
  host: NODEMAILER_HOST,
  port: NODEMAILER_PORT,
  secure: NODEMAILER_PORT == 465 ? true : false, // true for 465, false for other ports
  auth: {
    user: NODEMAILER_USER, // generated ethereal user
    pass: NODEMAILER_PASS, // generated ethereal password
  },
});

export const sendMail = async (content) => {
  console.log(transporter, "tansporter");
  try {
    const info = await transporter.sendMail({
      from: NODEMAILER_USER, // sender address
      to: content.to, // list of receivers
      subject: content.subject, // Subject line
      // text: "Hello world?", // plain text body
      html: content.body, // html body
    });
    console.log("info >>", info);
    return { success: true, info };
  } catch (error) {
    console.log("Error while sending mail", error);
    return { success: false, error };
  }
};
