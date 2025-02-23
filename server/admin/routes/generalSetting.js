import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/generalSetting.js";
const router = Router();

router.get("/general-chat-setting", sessionAuth, controller.generalChatSetting);
router.get("/general-chat-setting-config", sessionAuth, controller.generalSetting);
router.post("/general-chat-setting", sessionAuth, controller.updateGeneralSettings);
//render page for push notification settings
router.get("/third-party-integration", sessionAuth, controller.thirdParty);
router.post(
  "/push-notification-setting",
  sessionAuth,
  controller.pushNotificationSetting
);

export default router;
