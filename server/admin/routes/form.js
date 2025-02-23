import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import * as controller from "../controller/form.js";
const router = Router();

router.get("/forms", sessionAuth, controller.form);

export default router;
