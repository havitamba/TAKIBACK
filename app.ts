import { Server } from "socket.io";
import http from "http";
import { router } from "./src/routers/router";
import cors from "cors";
import express from "express";

const app = express();
const allowList = [
  "http://localhost:5173",
  "https://takifront-production.up.railway.app",
];
const corsOptionsDelegate = function (req: any, callback: any) {
  let corsOptions;
  if (allowList.indexOf(req.header("Origin")) !== -1) {
    corsOptions = {
      origin: req.header("Origin"),
      credentials: true,
    }; // reflect the origin of the request
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
};
app.use(cors(corsOptionsDelegate));

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
