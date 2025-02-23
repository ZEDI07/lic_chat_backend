import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import * as controller from "../controller/user.js";
import upload from "../../middleware/multer.js";
const router = Router();

// router.get("/register", controller.registrationForm);
router.post("/register", controller.registration);
router.post("/login", controller.login);
router.post("/login-uid", controller.loginUid);
router.post("/push-notification", auth, controller.updatePushNotificationToken);
router.delete("/push-notification", auth, controller.removePushNotificationToken);
router.get("/about", auth, controller.about);
router.post("/about", auth, controller.updateAbout);
router.delete("/about", auth, controller.deleteAbout)
// router.get("/profile/:user", auth, controller.getProfilePage);
router.post("/edit", auth, upload.single("avatar"), controller.editProfile);
router.post("/report", auth, controller.report);
// router.get("/report", auth, controller.report);
router.get("/translation", auth, controller.translations);
// router.post("/options", auth, controller.userOptions);
router.get("/permissions", auth, controller.getPermissions);
router.get("/general-settings", auth, controller.generalSettings)

export default router;
