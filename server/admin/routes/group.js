import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/group.js";
const router = Router();

router.get("/group", sessionAuth, controller.groups);
router.get("/group-add", sessionAuth, controller.groupAdd);
router.post("/group-add", sessionAuth, controller.groupAddPost);
router.get("/get-group-list", sessionAuth, controller.getGroupList);
router.get("/group-profile", sessionAuth, controller.groupProfile);
router.get("/get-group-user-list", sessionAuth, controller.groupUserList);
router.get("/group-edit", sessionAuth, controller.groupEdit);
router.post("/update-group-user-status", sessionAuth, controller.updateGroupUserStatus);
router.post("/group-edit", sessionAuth, controller.groupEditPost);
router.get("/group-search", sessionAuth, controller.searchGroup);
router.get("/group-user-search", sessionAuth, controller.searchGroupUser);
router.post("/add-group-user", sessionAuth, controller.addGroupUser);
router.get("/get-user-group", sessionAuth, controller.getUserGroups);
router.get("/get-add-user-group", sessionAuth, controller.getAddUserGroup);
router.post("/add-user-group", sessionAuth, controller.addUserGroup);
router.post("/delete-group", sessionAuth, controller.deleteGroup);

export default router;
