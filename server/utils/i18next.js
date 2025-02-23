import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const currDir = dirname(fileURLToPath(import.meta.url));

i18next.use(Backend).init(
  {
    debug: false,
    lng: "en",
    fallbackLng: "en",
    saveMissing: true,
    backend: {
      loadPath: path.join(currDir, `../locales/{{lng}}/common.json`),
      addPath: path.join(currDir, `../locales/{{lng}}/common.json`),
    },
    keySeparator: false
  },
  (err) => {
    err && console.log("error >>", err);
  }
);
