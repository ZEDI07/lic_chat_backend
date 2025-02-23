import cron from "node-cron";
import { GENERAL_SETTING_KEY } from "./server/config/constant.js";
import { RUN_CRON } from "./server/config/index.js";
import autoDelteAttach from "./server/helpers/autoDeleteMedia.js";
import { handleActiveCall } from "./server/helpers/call.js";
import { checkUnprocessedMedia } from "./server/helpers/queueMessage.js";
import { getGeneralSetting } from "./server/models/generalSetting.js";
import { updateUsers } from "./server/models/user.js";
import Storage from "./server/utils/storage.js";

// import "./server/models/seeds/index.js";

const response = await Storage.config();
console.log(response.message);

getGeneralSetting({ key: GENERAL_SETTING_KEY.image_setting })
  .then((res) => {
    res.success && Storage.compressConfig(res.data.quality);
  })
  .catch((err) => console.log("Error while general chat setting", err));

// getGeneralSetting({ key: GENERAL_SETTING_KEY.one_signal })
//   .then((res) => {
//     res.success && PushNotification.configClient(res.data.oneSignal);
//   })
//   .catch((err) => console.log("Error while general chat setting", err));
if (RUN_CRON) {
  checkUnprocessedMedia();
  const response = await updateUsers({ active: true }, { active: false });
  console.log("updating users active status", response);
  handleActiveCall()
  cron.schedule("0 0 * * *", autoDelteAttach.init);
}
