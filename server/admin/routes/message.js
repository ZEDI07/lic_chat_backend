import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/message.js";
const router = Router();

router.get("/message", sessionAuth, controller.message);
router.get("/message-list", sessionAuth, controller.messageList);
router.delete("/:message", sessionAuth, controller.deleteMessage);

export default router;
