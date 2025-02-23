import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/friend.js";
const router = Router();

router.post("/add-user-friend", sessionAuth, controller.addUserFriend);
router.get("/get-user-friends", sessionAuth, controller.getUserFriends);
router.post(
  "/update-friendship-status",
  sessionAuth,
  controller.updateFriendshipStatus
);

export default router;
