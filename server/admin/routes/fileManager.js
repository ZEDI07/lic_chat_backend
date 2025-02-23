import { Router } from "express";
import checkType from "../../middleware/checkType.js";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import upload from "../../middleware/multer.js";
import * as controller from "../controller/fileManager.js";
const router = Router();

router.get("/filemanager", sessionAuth, controller.fileManager);
router.post(
  "/file-upload/:type",
  checkType,
  sessionAuth,
  upload.single("file"),
  controller.fileUpload
);
router.get("/get-file-list", sessionAuth, controller.getFiles);
router.post("/delete-file", sessionAuth, controller.deleteFile);
// router.get("/download/:fileUrl", sessionAuth, controller.downloadImage);
export default router;
