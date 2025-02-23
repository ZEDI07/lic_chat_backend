import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/user.js";
const router = Router();

// renders user page
router.get("/user", sessionAuth, controller.user);
// render report page
router.get("/report", sessionAuth, controller.report);
// to get report list
router.get("/get-report-list", sessionAuth, controller.reportList);
// list all user
router.get("/get-user-list", sessionAuth, controller.getUserList);
// change user status
router.post("/update-user-status", sessionAuth, controller.updateUserStatus);
// Render add new user Page.
router.get("/add-user", sessionAuth, controller.addUser);
// Handle add new user
router.post("/add-user", sessionAuth, controller.addUserPost);
// render user profile page with user data.
router.get("/user-profile", sessionAuth, controller.profile);
// render profile edit page.
router.get("/user-profile-edit", sessionAuth, controller.profileEdit);
// handle data of profile edited.
router.post("/user-profile-edit", sessionAuth, controller.profileEditPost);
// handle search on keyword.
router.get("/search", sessionAuth, controller.searchUser);
// handle list of user that doesn't exist in group  -- required group id..
router.get("/get-add-group-user", sessionAuth, controller.getAddgroupUser);
// handle list of user that his friend. -- required user id.
router.get("/get-add-user-friend", sessionAuth, controller.getAddUserFriend);
// to checkout uid exist
router.get("/uid/:uid", sessionAuth, controller.getUid);

export default router;
