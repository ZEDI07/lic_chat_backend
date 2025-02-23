import { Router } from "express";
const router = Router();
import { settings, accountSetting, aboutApp, privacySetting, updatePrivacySetting, notificationSetting, updateNotificationSetting, starredMessage } from "../controller/setting.js";

router.get("/", settings);
router.get("/account", accountSetting);
router.get("/about", aboutApp);
router.get("/privacy", privacySetting);
router.post("/privacy", updatePrivacySetting);
router.get("/notification", notificationSetting);
router.post("/notification", updateNotificationSetting);
router.get("/starred", starredMessage); // get all starred message

export default router;
