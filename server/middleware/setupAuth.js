import { STATUS_CODE } from "../config/constant.js";
import { getGeneralSetting } from "../models/generalSetting.js";

export default async (req, res, next) => {
    try {
        const setupCompleted = await getGeneralSetting({ key: "setup_complete" });
        if (setupCompleted.success) {
            return next()
        }
        if (req.baseUrl) {
            return res.status(STATUS_CODE.bad_request).json({ message: "Chat system is not setup yet." })
        } else {
            return res.redirect("/setup");
        }
    } catch (error) {
        console.log('error', error)
        return res.status(STATUS_CODE.server_error).json({ message: "Something went wrong" })
    }
};