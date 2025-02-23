import { createClient } from "redis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_URL } from "./server/config/index.js";

class Redis {

  static getRedisClient = () => this.client;

  static setRedisClient = () => {
    let option = {};
    /**REDIS_URL && (option.REDIS_URL = REDIS_URL);
    REDIS_HOST && (option.host = REDIS_HOST);
    REDIS_PORT && (option.port = REDIS_PORT);
    REDIS_PASSWORD && (option.password = REDIS_PASSWORD)*/
   if (REDIS_URL) {
      option.url = REDIS_URL;
    } else {
      option = {
        socket: {
          host: REDIS_HOST,
          port: REDIS_PORT,
        },
        password: REDIS_PASSWORD,
      };
    }
    this.client = createClient(option);
    this.client.on("error", () => {
      console.log("Redis connection error");
      process.exit()
    })
    this.client.on("connection", () => {
      "Redis connected successfully"
    })

  }
}

export default Redis;