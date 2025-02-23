import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/storage.js";
const router = Router();

router.get("/storage", sessionAuth, controller.storageSetting);
router.post("/storage", sessionAuth, controller.configStorageSetting);
router.get("/storage-config", sessionAuth, controller.storageConfig);
router.get("/add-storage-services", sessionAuth, controller.addStorageServices);
router.get("/edit-storage-service", sessionAuth, controller.editStorageServices);
router.get("/get-storage-services", sessionAuth, controller.getStorageServices);
router.put("/storage", sessionAuth, controller.updateStorageSetting);
router.post("/delete-storage-services", sessionAuth, controller.deleteStorage);
router.post("/set-default-storage", sessionAuth, controller.setdefaultStorage);

export default router;
