import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/language.js";
const router = Router();

router.get("/language", sessionAuth, controller.language);
router.get("/language-add", sessionAuth, controller.addLanguagePage);
router.post("/add-language", sessionAuth, controller.addLanguage);
router.get("/get-languages", sessionAuth, controller.getAllconfigLanguage);
router.post("/set-default-language", sessionAuth, controller.setDefault);
router.get("/language-edit", sessionAuth, controller.editLanguagePage);
router.get("/edit-language", sessionAuth, controller.editLanguage);
router.post("/edit-language", sessionAuth, controller.updateLanguage);
router.post("/delete-language", sessionAuth, controller.deleteLanguage);
router.get("/search-language-key", sessionAuth, controller.editLanguage);

export default router;
