import { createAdapter } from "@socket.io/redis-adapter";
import { Emitter } from "@socket.io/redis-emitter";
import Redis from "./redis.js";
import { REDIS_HOST, REDIS_URL, RUN_CRON } from "./server/config/index.js";
import socketEvents from "./server/utils/socketEvents.js";

class SocketConnection {
  static getSocketInstance = () => this.emitter;

  static async setSocketInstance(io) {
    try {
      this.io = io;
      if (REDIS_URL || REDIS_HOST) {
        Redis.setRedisClient();
        const pubClient = Redis.getRedisClient();
        const subClient = pubClient.duplicate();
        await pubClient.connect();
        await subClient.connect();
        console.log("Redis PUB SUB Connected ✅✅")
        if (RUN_CRON) {
          const flushedRedis = await pubClient.flushAll();
          console.log("Flushed DB", flushedRedis)
        }
        pubClient.on("error", () =>
          console.log("error while connection pub client")
        );
        subClient.on("error", () =>
          console.log("error while connection sub client")
        );
        io.adapter(createAdapter(pubClient, subClient));
        this.emitter = new Emitter(pubClient);
      } else {
        this.emitter = io;
      }
      socketEvents(io);
    } catch (error) {
      console.log("Error while socket connection", error);
      process.exit();
    }
  }

  static emitSocketEvent = (to, eventName, data) => {
    console.log("TO >", to, "\t event Name >>", eventName);
    this.emitter.to(to).emit(eventName, data);
  };

  static socketRooms = () => this.io.sockets.adapter.rooms;
}

export default SocketConnection;
