import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/reaction.js";
const router = Router();

router.get("/reaction", sessionAuth, controller.reaction);
router.get("/reaction-add", sessionAuth, controller.addReaction);
router.post("/add-reaction", sessionAuth, controller.addReactionPost);
router.get("/get-reaction", sessionAuth, controller.getReactions);
router.get("/reaction-edit", sessionAuth, controller.editReaction);
router.post("/edit-reaction", sessionAuth, controller.editReactionPost);
router.post("/delete-reaction", sessionAuth, controller.deleteReaction);

export default router;
