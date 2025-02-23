import { Router } from "express";
import * as controller from "../controller/friend.js";
const router = Router();

// router.get("/", controller.friends); // all friends
// router.get(
//   "/block/:user",
//   //block User
//   controller.blockUserDialog
// );
router.post("/block", controller.blockUser); //block user
router.get("/unblock/list", controller.getAllUnblockedFriends);
// router.get(
//   "/unblock/:user",
//   checkPermission("block_users"), //unblock user dialog
//   controller.unblockUserDialog
// );
router.post("/unblock", controller.unblockUser); // user unblock
router.get("/except", controller.getExceptList); // all except users to not show status and story
router.post("/except", controller.addInExcept); // add and remove except user
router.get("/active", controller.active); //Active User ..

export default router;
