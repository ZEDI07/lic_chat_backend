import { Router } from "express";
import { GENERAL_SETTING_KEY } from "../../config/constant.js";
import { getGeneralSetting } from "../../models/generalSetting.js";
import * as controller from "../controller/admin.js";
const router = Router();

router.get("/", async (req, res) => {
    const isCompleted = await getGeneralSetting({ key: GENERAL_SETTING_KEY.setup_complete });
    if (isCompleted.success) {
        return res.redirect("/")
    }
    return res.render("setup");
});
router.post("/", controller.setup);

export default router;
