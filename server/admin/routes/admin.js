import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/admin.js";
const router = Router();

router.get("/", sessionAuth, (req, res) => {
  return res.redirect("/user#active-users");
});
router.get("/login", controller.login);
router.post("/login", controller.loginPost);
router.get("/forget-password", controller.forgetPassword);
router.post("/forget-password", controller.forgetPasswordPost);
router.get("/me", sessionAuth, controller.me);
router.get("/logout", sessionAuth, controller.logout);

export default router;
