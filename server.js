import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import session from "express-session";
import { createServer } from "http";
import morgan from "morgan";
import path, { dirname } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";
import adminRoutes from "./server/admin/routes/index.js";
import setupRoute from "./server/admin/routes/setup.js";
import api from "./server/apis/router/index.js";
import { DB_URL, SECRET_KEY, CHAT_BACKEND, CHAT_FRONTEND, EMPLOYEE_ENGAGEMENT} from "./server/config/index.js";
import { errorHandler } from "./server/middleware/errorHandler.js";
import setupAuth from "./server/middleware/setupAuth.js";
import thirdPartyApis from "./server/third-party/routers/index.js";
import SocketConnection from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const store = MongoStore.create({ mongoUrl: DB_URL });
const app = express();
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser(SECRET_KEY));
app.use(
  session({
    store: store,
    secret: SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: { sameSite: true, maxAge: 1000 * 60 * 60 * 24 },
    name: "session",
  })
);
app.use(cors({origin:[CHAT_BACKEND,CHAT_FRONTEND,EMPLOYEE_ENGAGEMENT]}));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api", setupAuth, api);
app.use("/x-api", thirdPartyApis);
app.use("/setup", setupRoute)
app.use("/", setupAuth, adminRoutes);

app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  allowEIO3: true,
  transports: ["websocket"],
  cors: {
	  origin:[CHAT_BACKEND,CHAT_FRONTEND,EMPLOYEE_ENGAGEMENT],
  },
});

SocketConnection.setSocketInstance(io);
connectDB(httpServer);
import("./server/utils/i18next.js");

process.on("uncaughtException", (error, source) => {
  console.log("uncaught Exception error", error, source);
});

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", error);
});
