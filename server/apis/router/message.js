import { Router } from "express";
import { checkPermission } from "../../middleware/checkPermission.js";
import upload from "../../middleware/multer.js";
import * as controller from "../controller/message.js";
const router = Router();

router.post(
  "/",
  upload.fields([{ name: "file" }, { name: "thumbnail" }]), // Send Message api
  controller.send
);
// router.get(
//   "/delete/:messageId/:fromMe",
//   controller.deleteDialog
// );

router.post("/delete", controller.deleteMe);
router.post("/delete-everyone", controller.deleteEveryone);
router.get("/search/:type/:text/:limit/:skip", controller.searchMessage); // return a forward message dialog with user to forward

// router.get("/forward", controller.forwardDialog); // Forward message to the users.

router.post("/forward", controller.forward); // to edit a message.

router.post("/edit", checkPermission("allow_edit_message"), controller.edit); // message edit
router.post("/location/stop", checkPermission("allow_edit_message"), controller.stopLiveLocation);
router.get("/starred/:chat/:chatType", controller.starredMessages); // Message starred and unstarred
router.post("/starred", controller.starred);
router.post("/unstarred", controller.unstarred);
router.get("/media/:chat/:chatType/:MediaType", controller.media); // to get media of particular chat.
router.get("/info/:messageId", controller.messageInfo); // to get message info
router.post("/:chatId/:receiverType", controller.messages); // to get Message of Particular user.
router.post("/received", controller.messageReceived); // message received
router.post("/reaction", controller.addReaction); // add reaction  on message
router.post("/remove-reaction", controller.removeReaction); // remove reactio on messsage
router.post("/poll-vote", controller.pollVote); // to update the vote in poll message
router.get("/poll/:poll", controller.getPoll); // to get poll

export default router;
