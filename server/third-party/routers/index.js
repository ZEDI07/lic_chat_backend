import express from "express";
const app = express();
import user from "./user.js";
import level from "./level.js";

app.use("/user", user);
app.use("/level",level);
export default app;
