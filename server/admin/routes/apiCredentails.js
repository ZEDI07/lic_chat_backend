import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/apiCredentials.js";
const router = Router();

router.get("/credentials", sessionAuth, controller.apicredentials);
router.post("/credential-add", sessionAuth, controller.addNewClient);
router.get("/get-credentials", sessionAuth, controller.getAllCredentials);
router.post("/delete-credential", sessionAuth, controller.deleteCredentials);
router.post("/update-credential", sessionAuth, controller.updateCredentialData);

export default router;
