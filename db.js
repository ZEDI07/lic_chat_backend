import mongoose from "mongoose";
import { DB_URL, PORT, SERVER_URL } from "./server/config/index.js";

// mongoose.set("debug", true);
mongoose.set("allowDiskUse", true);
export const connectDB = (httpServer) => {
  mongoose
    .connect(DB_URL)
    .then(async () => {
      console.log("Database Connected Successfully ✅✅");
      const serverPort = PORT || 4001;
      import("./startupConfig.js");
      httpServer.listen(serverPort, async () => {
        console.log("server is up on port", PORT, SERVER_URL);
      });
    })
    .catch((error) => {
      console.log("ERROR while connecting database", error);
      process.exit();
    });
};
