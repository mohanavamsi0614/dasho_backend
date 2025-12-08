import express from "express";
import { connectDB } from "./utils/db.js";
import adminRouter from "./admin/route.js";
import cors from "cors";
import {createServer} from "http";
import participantRouter from "./participant/route.js";
import { initSocket } from "./utils/socket.js";

const app = express();
const Server=createServer(app);
const PORT = process.env.PORT || 6100;

app.use(express.json());
app.use(express.static("./"));
app.use(cors({ origin: '*' }));

app.use("/admin", adminRouter);
app.use("/participant", participantRouter);

let dbInstance = null;
connectDB()
  .then((db) => {
    dbInstance = db;
    console.log("Database connected successfully");

    Server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      initSocket(Server);
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
  });

app.get("/", async (req, res) => {
  res.send("Welcome to the Dasho Server!");
});

export default Server;
