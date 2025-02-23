import { Router } from "express";
import { checkPermission } from "../../../middleware/checkPermission.js";
import upload from "../../../middleware/multer.js";
import * as controller from "./controller.js";
import { getGeneralSetting } from "../../../models/generalSetting.js";
import { GENERAL_SETTING_KEY, STATUS_CODE } from "../../../config/constant.js";
const router = Router();

const groupMiddleware = async (req, res, next) => {
  console.log("Group middleware");
  const groupConfig = await getGeneralSetting({ key: GENERAL_SETTING_KEY.group });
  console.log("Group config", groupConfig);
  if (groupConfig && groupConfig.success && groupConfig.data.group.enabled)
    return next()
  else
    return res.status(STATUS_CODE.bad_request).json({ message: "Group is disabled" })
}

router.get("/", groupMiddleware, controller.groups); // get groups

router.get("/create", checkPermission("create_groups"), groupMiddleware, controller.createGroup); // get create group

router.post("/create", upload.single("avatar"), checkPermission("create_groups"), groupMiddleware, controller.createNewGroup);

router.get("/add-user/:group", groupMiddleware, controller.getAddUser);

router.post("/add-user", groupMiddleware, controller.addUser);

router.get("/link/:group", groupMiddleware, controller.inviteLink);

router.get("/reset-link/:group", groupMiddleware, controller.resetLink);
router.get("/qr/:group", groupMiddleware, controller.getQrPage);

router.get("/join/:token", groupMiddleware, controller.validateInviteLink);

router.post("/join-req", groupMiddleware, controller.joinInviteLink);

router.post("/join-req-cancel", groupMiddleware, controller.cancelJoinRequest);

router.get("/:group", groupMiddleware, controller.details); // get group details

router.post("/remove", groupMiddleware, controller.removeUser);

router.post("/edit", upload.single("avatar"), groupMiddleware, controller.editGroup);

router.delete("/delete", groupMiddleware, controller.deleteGroup);

router.post("/leave", groupMiddleware, controller.leaveGroup); // leave the group if you are user

router.post("/change-member-role", groupMiddleware, controller.changeMemberRole);

router.post("/change-password", checkPermission("make_group_admin"), groupMiddleware, controller.changePass);

router.put("/setting", checkPermission("create_groups"), groupMiddleware, controller.changeGroupSetting);

router.get("/pending/:group", groupMiddleware, controller.pendingMembers);

router.post("/pending", groupMiddleware, controller.editPending);

router.post("/forgot-password", checkPermission("create_groups"), groupMiddleware, controller.groupForgotPassword);

router.post("/resend-otp", groupMiddleware, controller.resendOtp);

router.post("/verify-otp", groupMiddleware, controller.verifyGroupOtp);

router.get("/members/:id", groupMiddleware, controller.members);

router.post("/validate-password", groupMiddleware, controller.validatePassword);

export default router;
