import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/sticker.js";
const router = Router();

router.get("/sticker", sessionAuth, controller.stickerPage);
router.get("/sticker-category-add", sessionAuth, controller.stickerAddCategoryPage);
router.post("/add-sticker-category", sessionAuth, controller.addStickerCategory);
router.get("/get-stickers-category", sessionAuth, controller.getStickerCategory);
router.get("/sticker-category-edit", sessionAuth, controller.editStickerCategory);
router.post("/edit-sticker-category", sessionAuth, controller.editStickerCategoryPost);
router.post("/delete-sticker-category", sessionAuth, controller.deleteStickerCategory);
router.get("/sticker-pack-add", sessionAuth, controller.stickerAddPackPage);
router.post("/add-sticker-pack", sessionAuth, controller.addStickerPack);
router.get("/get-sticker-pack", sessionAuth, controller.getStickerPacks);
router.post("/delete-sticker-pack", sessionAuth, controller.deleteStickerPack);
router.get("/sticker-pack-edit", sessionAuth, controller.editStickerPack);
router.post("/edit-sticker-pack", sessionAuth, controller.editStickerPackPost);
router.get("/sticker-pack-manage", sessionAuth, controller.manageStickers);
router.get("/sticker-add", sessionAuth, controller.stickerAddPage);
router.post("/add-sticker", sessionAuth, controller.addsticker);
router.get("/pack-sticker", sessionAuth, controller.sticker);
router.post("/sticker-delete", sessionAuth, controller.deleteSticker);
router.get("/sticker-edit", sessionAuth, controller.editStickerPage);
router.post("/edit-sticker", sessionAuth, controller.editSticker);
router.get("/search-sticker", sessionAuth, controller.search);

export default router;
