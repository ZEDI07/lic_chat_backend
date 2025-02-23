import { Router } from "express";
import * as controller from "../controller/user.js";
const router = Router();

router.post("/", controller.addUser);
router.put("/:uid", controller.updateDetails);
router.delete("/:uid", controller.deleteUser);
router.post("/:uid/friends", controller.addFriend);
router.delete("/:uid/friends", controller.deleteFriend);

export default router;
