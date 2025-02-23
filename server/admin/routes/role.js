import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/role.js";
const router = Router();

router.get("/role", sessionAuth, controller.role);
router.get("/role-add", sessionAuth, controller.roleAdd);
router.post("/role", sessionAuth, controller.roleAddPost);
router.get("/get-roles", sessionAuth, controller.getRoles);
router.get("/role-edit", sessionAuth, controller.roleEdit);
router.post("/role-edit", sessionAuth, controller.roleEditPost);
router.get("/role-profile", sessionAuth, controller.roleProfile);
router.post("/update-role-status", sessionAuth, controller.updateRoleStatus);
router.post(
  "/update-role-permission",
  sessionAuth,
  controller.updateRolePermission
);
router.get("/validate-role-id", sessionAuth, controller.validateRole);

export default router;
