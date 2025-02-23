import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/wallpaper.js";
const router = Router();

router.get("/wallpaper", sessionAuth, controller.backgroundPage);
router.get("/wallpaper-add", sessionAuth, controller.addWallpaperPage);
router.post("/add-wallpaper", sessionAuth, controller.addWallpaper);
router.get("/get-wallpaper", sessionAuth, controller.wallpaper);
router.post("/delete-wallpaper", sessionAuth, controller.deleteWallpaper);
router.get("/wallpaper-edit", sessionAuth, controller.editWallpaper);
router.post("/edit-wallpaper", sessionAuth, controller.editWallpaperPost);
router.get("/wallpaper-category-add", sessionAuth, controller.addWallpaperCategoryPage);
router.post("/add-wallpaper-category", sessionAuth, controller.addWallpaperCategory);
router.get("/get-wallpaper-category", sessionAuth, controller.getWallpaperCategory);
router.post("/delete-wallpaper-category", sessionAuth, controller.deleteWallpaperCategory);
router.get("/wallpaper-category-edit", sessionAuth, controller.editWallpaperCategory);
router.post("/edit-wallpaper-category", sessionAuth, controller.editWallpaperCategoryPost);
router.get("/wallpaper-category-manage", sessionAuth, controller.wallpaperManage);

export default router;
