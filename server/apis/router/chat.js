import { Router } from "express";
import * as controller from "../controller/chat.js";
const router = Router();

router.get("/stickers", controller.stickers); //  * API to get Active Sticker Category.
router.get("/stickers/category/:categoryId", controller.categoryStickers); // * API to Get All Active Sticker of Category
router.get("/stickers/pack/:packId", controller.packStickers); // * API to Get All Active Sticker of Pack.
router.get("/reactions", controller.reactions); // * Api to get all Reaction.
router.get("/", controller.chats); // to get all chats sort by last last.
router.get("/unread", controller.unreadChats); // to get all unread chats count
// router.get("/delete/:chat", controller.deleteChatDialog); // Delete Confirmation Dialog box
router.post("/delete", controller.deleteChats); // Delete all message of user
// router.get("/mute", controller.muteDialog); //Mute Conversation
router.post("/mute", controller.mute); // Mute conversation
router.post("/unmute", controller.unmute); // unmute conversation
router.get("/archive/count", controller.archiveCount); //get archive chat count
router.post("/archive", controller.archive); //Archive Conversation
router.post("/unarchive", controller.unarchive); //Unarchive conversation
router.post("/pin", controller.pin); // pin and unpin conversation
router.post("/unpin", controller.unpin); // to unpin
router.get("/new-chat", controller.newChats); // get all friends
router.post("/mark-unread", controller.markUnread); // to mark unread chat
router.post("/mark-read", controller.markRead); // to mark read chat
router.get("/search", controller.search); // for chat messages starmessages media search
// router.get("/more/:chatType/:chatId", controller.getMore); // first screen swipe options more button
router.get("/theme/wallpapers/:id", controller.getWallpaper); // to get complete chat object of perticular chat id
router.get("/theme", controller.getWallpaperThemes); // get wallpaper of themes
router.get("/sound-wallpaper/:chat", controller.getSoundWallpaper); // get sound and wallpaper page
router.post("/set-wallpaper", controller.setWallpaper); // set wallpaper for perticular chat
router.get("/:chat", controller.chatsById); // get individual chat information

export default router;
