import express from "express";
import { auth } from "../../middleware/auth.js";
import clientAuth from "../../middleware/clientAuth.js";
import { chatWindow } from "../controller/user.js";
import chatRoutes from "./chat.js";
import friendRoutes from "./friend.js";
import messageRoutes from "./message.js";
import settingRoutes from "./setting.js";
import userRoutes from "./user.js";
import path from "path";
import fs from "fs/promises";

const app = express();

app.get("/", auth, chatWindow);
app.use("/user", clientAuth, userRoutes);
app.use("/chat", clientAuth, auth, chatRoutes);
app.use("/friend", clientAuth, auth, friendRoutes);
app.use("/message", clientAuth, auth, messageRoutes);
app.use("/setting", clientAuth, auth, settingRoutes);

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const modulesDir = path.join(__dirname, '../modules');

try {
  const modules = await fs.readdir(modulesDir);
  for (const module of modules) {
    const modulePath = path.join(modulesDir, module, 'routes.js');
    try {
      const { default: moduleRouter } = await import(modulePath);
      if (moduleRouter) {
        console.log(`Loading module: ${module}`);
        app.use(`/${module}`, clientAuth, auth, moduleRouter);
      }
    } catch (error) {
      console.log(`Skipping module: ${module}. Error: ${error.message}`);
    }
  }
} catch (error) {
  console.error(`Failed to load modules: ${error.message}`);
}

export default app;
