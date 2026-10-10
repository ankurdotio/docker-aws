import { log } from "console";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import codeRoutes from "./routes/codeRoutes.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL }));
// app.use(express.static("public"));
app.use(express.json());

// server io connection
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const ySocketIO = new YSocketIO(io);
ySocketIO.initialize();

// api routes
app.use("/v1", codeRoutes);

// app.get("/", (req, res) => {
//   res.status(200).json({
//     message: "Collaborative Code & Drawing Server",
//     success: true,
//   });
// });

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "health OK",
    success: true,
  });
});

httpServer.listen(process.env.PORT, () => {
  console.log(`server listening on the port ${process.env.PORT}`);
});
