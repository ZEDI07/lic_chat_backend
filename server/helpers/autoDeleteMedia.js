import { GENERAL_SETTING_KEY } from "../config/constant.js";
import { deleteFile } from "../models/filemanager.js";
import { getGeneralSetting, updateGeneralSetting } from "../models/generalSetting.js";
import messageSchema from "../models/schema/message.js"

class AutoDeleteAttach {
  constructor() { }

  async handleDelete(data) {
    console.log("RUNNING CRON AUTO DELETE MEDIA FILE 0 0 * * *")
    const value = data[GENERAL_SETTING_KEY.auto_delete_attachment];
    const limit = 1000;
    let lastMessage;
    let more = true;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - value.day)
    do {
      const mediaMessages = await messageSchema.aggregate(
        [
          {
            '$match': {
              'contentType': {
                '$in': value.contentType
              }
            }
          }, {
            '$sort': {
              '_id': -1
            }
          }, {
            '$group': {
              '_id': '$media',
              'message': {
                '$first': '$$ROOT'
              }
            }
          },
          {
            '$match': {
              'message.createdAt': {
                '$lt': date,
                ...value.lastDeletedAt ? { '$gte': value.lastDeletedAt } : {}
              },
              ...lastMessage ? { "message._id": { $gt: lastMessage } } : {}
            }
          },
          {
            $sort: {
              "message._id": 1
            }
          },
          {
            $limit: limit
          }
        ]
      );
      if (mediaMessages.length < limit)
        more = false;
      else
        lastMessage = mediaMessages[limit - 1].message._id;
      for (let message of mediaMessages) {
        deleteFile(message._id);
      }
    } while (more);
    const response = await updateGeneralSetting({ key: GENERAL_SETTING_KEY.autoDelteAttach }, { lastDeletedAt: new Date() }, { new: true })
    console.log("updated last Delete Day", response.data)
  }

  async init() {
    const setting = await getGeneralSetting({ key: GENERAL_SETTING_KEY.auto_delete_attachment });
    if (!setting.success && !setting.data[GENERAL_SETTING_KEY.auto_delete_attachment].status)
      return;
    this.handleDelete(setting.data);
  }
}

const autoDelteAttach = new AutoDeleteAttach();
export default autoDelteAttach;