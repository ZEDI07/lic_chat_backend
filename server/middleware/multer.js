import fs from "fs";
import multer from "multer";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { getUploadFileUrl } from "../utils/common.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const currDir = dirname(fileURLToPath(import.meta.url));
    const fileurl = getUploadFileUrl(req.params.type);
    file.localPath = fileurl;
    const pathDir = path.join(currDir, `../../public/${fileurl}`);
    if (!fs.existsSync(pathDir)) {
      fs.mkdirSync(pathDir, { recursive: true });
    }
    cb(null, pathDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer();
export default upload;
