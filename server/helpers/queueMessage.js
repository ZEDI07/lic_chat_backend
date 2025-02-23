import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import i18next from "i18next";
import path from "path";
import { RECEIVER_TYPE } from "../config/constant.js";
import { getfiles, updateFileStatus } from "../models/filemanager.js";
import { getLanguage } from "../models/language.js";
import { messageInfo, urlMaker } from "../models/message.js";
import { userDetail } from "../models/user.js";
import Storage from "../utils/storage.js";
import { handleNewMessage, messageReceiver } from "./message.js";

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue({ message, file, receiver, reply, sender, t }) {
    console.log("new message in queue  >>>", message._id);
    this.queue.push([message, file, receiver, reply, sender, t]);
    this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const [message, file, receiver, reply, sender, t] = this.queue.shift();

    try {
      const inputPath = file.destination;
      const oldExtension = path.extname(inputPath);
      let outputPath = inputPath.replace("original", "converted")
      outputPath = outputPath.replace(
        new RegExp(`${oldExtension}$`),
        `.mp4`
      );
      await new Promise((res, rej) => {
        ffmpeg()
          .input(inputPath)
          .outputFormat("mp4")
          // .size(`${reducesize}%`)
          // .fps(reducefps)
          .output(outputPath)
          .on("error", (err) => {
            // fs.rm(inputPath, {}, (err) => {
            //   if (err) console.log("error while removing input file", err);
            // });
            fs.rm(outputPath, {}, (err) => {
              if (err) console.log("error while removing output file", err);
            });
            rej(err);
          })
          .outputOption(["-preset ultrafast"])
          .on("end", () => {
            const data = fs.readFileSync(outputPath);
            file.buffer = data;
            file.size = data.length;
            file.mimetype = "video/mp4";
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
      console.log("Video Processed ::>>", message._id);
      const uploaded = await Storage.uploadFile(file);
      if (uploaded.success) {
        await updateDatabase(message, uploaded.data);
        await handleNewMessage({
          message: {
            ...message.toJSON(),
            media: uploaded.data.media,
            processed: true,
          },
          receiver,
          reply,
          sender,
          t,
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
    } finally {
      this.processing = false;
      this.process();
    }
  }
}

async function updateDatabase(message, data) {
  await updateFileStatus({ _id: message.media }, data);
}

export async function checkUnprocessedMedia() {
  const files = await getfiles({ processed: false, status: true });
  console.log("Checking unprocessed media", files);
  if (files.success) {
    for (let file of files.data) {
      const messageDetails = await messageInfo({ media: file._id });
      if (messageDetails.success) {
        const message = messageDetails.data;
        let receiver = await messageReceiver({ chat: message.receiver, user: message.sender, receiverType: message.receiverType })
        if (!receiver.success) continue;
        receiver = receiver.data;
        let replyMessage;
        if (message.reply) {
          const filter =
            message.receiverType == RECEIVER_TYPE.group
              ? {
                _id: message.reply,
                deleted: false,
                receiver: message.receiver,
              }
              : {
                _id: message.reply,
                deleted: false,
                $or: [
                  {
                    sender: message.sender,
                    receiver: message.receiver,
                  },
                  {
                    sender: message.receiver,
                    receiver: message.sender,
                  },
                ],
              };
          replyMessage = await messageInfo(filter);
          if (replyMessage.success) {
            let sender = await userDetail(
              { _id: replyMessage?.data?.sender },
              { name: 1, _id: 1, avatar: 1 }
            );
            let mediaUrl;
            if (replyMessage.data.media) {
              mediaUrl = await urlMaker(replyMessage.data.media);
            }

            replyMessage.data = {
              ...replyMessage.data._doc,
              user: {
                name: sender?.data?.name,
                avatar: sender?.data?.avatar,
                _id: sender?.data?._id,
              },
              media: mediaUrl?.data?.media,
            };
          } else {
            continue;
          }
        }
        const sender = await userDetail({ _id: message.sender });
        if (!sender.success) continue;
        const userLanguage =
          sender?.language &&
          (await getLanguage({
            _id: sender?.language,
          }));
        await i18next.changeLanguage(
          (userLanguage && userLanguage.success && userLanguage.data.key) ||
          "en"
        );
        const t = (key) => i18next.t(key);
        messageQueue.enqueue({
          message,
          file,
          receiver: receiver.data,
          reply: replyMessage?.data,
          sender: sender.data,
          t,
        });
      }
    }
  }
}

const messageQueue = new MessageQueue();
export default messageQueue;
