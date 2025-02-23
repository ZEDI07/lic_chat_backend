import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import path, { dirname } from "path";
import sharp from "sharp";
import Client from "ssh2-sftp-client";
import { fileURLToPath } from "url";
import { CONTENT_TYPE, FILE_TYPE, STORAGE_TYPE } from "../config/constant.js";
import { getStorageServiceConfig } from "../models/storage.js";
import convert from "heic-convert";
import ffmpeg from "fluent-ffmpeg";
const currDir = dirname(fileURLToPath(import.meta.url));

class Storage {
  constructor() {
    this.client = null;
    this.serviceDetails = null;
    this.compressConfig = 50;
  }

  static config = async (config) => {
    try {
      config ||= await getStorageServiceConfig({
        default: true,
        enabled: true,
        status: true,
      });
      if (!config.success) {
        return { success: false, message: "Config not found." };
      }
      this.serviceDetails = config.data;
      if (!config.data) {
        return { success: false, message: "Storage not found." };
      }
      this.client = await this.createClient(config.data);
      return {
        success: true,
        message: "Storage Service Configured Successfully.",
      };
    } catch (error) {
      console.log(error);
      return { success: false, message: "Error while configure Stroage" };
    }
  };

  static compressConfig = (quality) => (this.compressConfig = quality);

  static createClient = async ({ storage, credentials }) => {
    switch (storage) {
      case STORAGE_TYPE.amazon_s3:
      case STORAGE_TYPE.amazon_s3_compatible_storage:
      case STORAGE_TYPE.digital_ocean_space:
      case STORAGE_TYPE.wasabi_cloud_storage: {
        const config = {
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
          },
          region:
            storage == STORAGE_TYPE.digital_ocean_space
              ? "us-east-1"
              : credentials.region,
        };
        credentials.endpoint_url &&
          (config.endpoint = credentials.endpoint_url);
        return new S3Client(config);
      }
      case STORAGE_TYPE.virtual_file_system: {
        const sftp = new Client();
        const config = {
          host: credentials.remoteHost,
          port: credentials.remotePort,
          username: credentials.username,
          password: credentials.password,
        };
        await sftp.connect(config);
        console.log("Connection Established");
        return sftp;
      }
      case STORAGE_TYPE.local_storage:
        return null;
      default:
        return null;
    }
  };

  static getClient = () => this.client;

  static convertHeifToJpeg = async (file) => {
    console.log("heif conversion");
    const jpegData = await convert({
      buffer: file.buffer,
      format: "JPEG",
      quality: 1,
    });
    file = {
      fieldname: file.fieldname,
      originalname: file.originalname.replace(".heif", ".jpeg"),
      encoding: file.encoding,
      mimetype: "image/jpeg",
      buffer: jpegData,
      size: jpegData.length,
      fileType: file.fileType,
      processed: true,
    };

    return file;
  };

  static uploadFile = async (file) => {
    try {
      if (!this.serviceDetails) {
        return { success: false, message: "No Storage Service is Configured." };
      }
      const mediaType = file.mimetype.split("/")[0];
      const format = file.mimetype.split("/")[1];
      const formatCheck = {
        heif: true,
        HEIF: true,
        heic: true,
        HEIC: true,
      };

      file.fileType == FILE_TYPE.media &&
        !formatCheck[format] &&
        !file?.processed &&
        (await this.compress(file, mediaType));

      formatCheck[format] && (file = await this.convertHeifToJpeg(file));

      if (file?.processed == false) {
        return {
          success: true,
          data: file,
        };
      }

      const filePath = this.filePath(file.fileType);
      const fileName = this.fileName(file, mediaType);
      const fileurl = filePath + "/" + fileName;
      const { _id, storage, credentials } = this.serviceDetails;
      if (storage == STORAGE_TYPE.local_storage) {
        const pathDir = path.join(currDir, `../../public/${filePath}`);
        if (!fs.existsSync(pathDir)) {
          fs.mkdirSync(pathDir, { recursive: true });
        }
        fs.writeFileSync(pathDir + "/" + fileName, file.buffer);
        return {
          success: true,
          data: {
            ...file,
            url: fileurl,
            serviceId: _id,
            media: credentials.cdn_url + fileurl,
          },
        };
      }
      const client = this.getClient();
      if (!client)
        return { success: false, message: "No Storage Service is Configured." };

      switch (storage) {
        case STORAGE_TYPE.amazon_s3:
        case STORAGE_TYPE.amazon_s3_compatible_storage:
        case STORAGE_TYPE.digital_ocean_space:
        case STORAGE_TYPE.wasabi_cloud_storage:
          {
            const command = new PutObjectCommand({
              ACL: "public-read",
              Bucket: credentials.bucket,
              Key: fileurl,
              Body: file.buffer,
              ContentType: file.mimetype,
            });
            await client.send(command);
          }
          break;
        case STORAGE_TYPE.virtual_file_system:
          {
            const remotePath =
              (await client.cwd()) + `/${credentials.path}${filePath}`;
            const path = await client
              .exists(remotePath)
              .catch((error) =>
                console.log("Error while checking path", error)
              );
            if (!path) {
              await client.mkdir(remotePath, true);
            }
            await client.put(file.buffer, `${remotePath}/${fileName}`);
          }
          break;
        default:
          break;
      }
      const url = credentials.path ? `${credentials.path}${fileurl}` : fileurl;
      return {
        success: true,
        data: {
          ...file,
          url: url,
          serviceId: _id,
          media: credentials.cdn_url + url,
        },
      };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  };

  static deleteFile = async (file) => {
    try {
      const serviceDetails = await getStorageServiceConfig({
        _id: file.serviceId,
      });
      if (
        !serviceDetails.success ||
        !serviceDetails.data.status ||
        !serviceDetails.data.enabled
      )
        return {
          success: false,
          message: "Service not available.",
        };
      const { data } = serviceDetails;
      if (data.storage == STORAGE_TYPE.local_storage) {
        const pathDir = path.join(currDir, `../../public/${file.url}`);
        fs.rmSync(pathDir);
        return { success: true, message: "Removed Successfully" };
      }
      let client;
      if (data.default) {
        client = this.getClient();
      } else {
        client = await this.createClient(data);
      }
      switch (data.storage) {
        case STORAGE_TYPE.amazon_s3:
        case STORAGE_TYPE.amazon_s3_compatible_storage:
        case STORAGE_TYPE.digital_ocean_space:
        case STORAGE_TYPE.wasabi_cloud_storage: {
          const command = new DeleteObjectCommand({
            Bucket: serviceDetails.data.credentials.bucket,
            Key: file.url,
          });
          await client.send(command);
          break;
        }
        case STORAGE_TYPE.virtual_file_system:
          {
            await client.delete(file.url);
          }
          break;
        default:
          return { success: false, message: "service unavailable" };
      }
      return { success: true, message: "File Removed Successfully." };
    } catch (error) {
      console.log(error);
      return { success: false, message: "error while deleting file" };
    }
  };

  static compress = async (file, mediaType) => {
    switch (mediaType) {
      case CONTENT_TYPE.image:
        {
          // const chatConfigData = await getGeneralSetting({ imageSize: 1 });
          // const width =
          //   (chatConfigData.success && chatConfigData.data.imageSize.width) ||
          //   300;
          // const height =
          //   (chatConfigData.success && chatConfigData.data.imageSize.width) ||
          //   200;
          const format = file.mimetype.split("/")[1];
          const { data, info } = await (() =>
            new Promise((res, rej) =>
              sharp(file.buffer)
                .toFormat(format, { quality: 50 })
                .toBuffer((err, data, info) => {
                  if (err) rej(err);
                  res({ data, info });
                })
            ))();
          file.buffer = data;
          file.size = info.size;
          file.processed = true;
        }
        break;
      case CONTENT_TYPE.video:
        {
          if (file.mimetype.split("/")[1] !== "mp4") {
            const date = Date.now();
            const pathDir = "/tmp";
            if (!fs.existsSync(pathDir)) {
              fs.mkdirSync(pathDir, { recursive: true });
            }
            const inputPath = path.join(
              pathDir,
              `/original_${date}${path.extname(file.originalname)}`
            );
            fs.writeFileSync(inputPath, file.buffer);
            file.destination = inputPath;
            file.processed = false;
          } else file.processed = true;
        }
        break;

      case CONTENT_TYPE.audio: {
        if (file.mimetype.split("/")[1] !== "mpeg") {
          const date = Date.now();
          const pathDir = "/tmp";
          if (!fs.existsSync(pathDir)) {
            fs.mkdirSync(pathDir, { recursive: true });
          }
          const oldExtension = path.extname(file.originalname);
          const inputPath = path.join(
            pathDir,
            `/original_${date}${oldExtension}`
          );
          const outputPath = inputPath.replace(
            new RegExp(`${oldExtension}$`),
            `.mp3`
          );
          fs.writeFileSync(inputPath, file.buffer);
          await new Promise((res, rej) => {
            ffmpeg()
              .input(inputPath)
              .toFormat("mp3")
              .output(outputPath)
              .on("error", (err) => {
                fs.rm(outputPath, {}, (err) => {
                  if (err) console.log("error while removing output file", err);
                });
                rej(err);
              })
              .on("end", () => {
                const data = fs.readFileSync(outputPath);
                file.buffer = data;
                file.size = data.length;
                file.mimetype = "audio/mpeg";
                file.originalname = file.originalname.replace(
                  new RegExp(`${oldExtension}$`),
                  `.mp3`
                );
                fs.rm(inputPath, {}, (err) => {
                  if (err) console.log("error while removing input file", err);
                });
                fs.rm(outputPath, {}, (err) => {
                  if (err) console.log("error while removing output file", err);
                });
                res("Processed");
              })
              .run();
          });
        }
        file.processed = true;
        break;
      }
      default:
        file.processed = true;
        break;
    }
  };

  static filePath = (type = "media") => {
    const date = new Date();
    return `uploads/${type}/${date.getFullYear()}/${date.getMonth() + 1
      }/${date.getDate()}`;
  };

  static fileName = (file, mediaType) =>
    `${Date.now() + "-" + Math.round(Math.random() * 1e9)}${mediaType === CONTENT_TYPE.video
      ? ".mp4"
      : path.extname(file.originalname)
    }`;
}

export default Storage;
