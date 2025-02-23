import { Router } from "express";
import * as controller from "../controller/level.js";
const router = Router();

router.post("/", controller.addLevel);
router.put("/:level_id", controller.updateLevel)
router.delete("/:level_id", controller.deleteLevel);

export default router;
