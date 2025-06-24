import { Server } from "socket.io";
import http from "http";
import { router } from "./src/routers/router";
import cors from "cors";
import express from "express";

const app = express();
app.use(
  cors({
    origin: "https://takifront-production.up.railway.app",
    credentials: true,
  })
);

const port = 5000;
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["*"],
    methods: ["GET", "POST"],
  },
});

router(io);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
