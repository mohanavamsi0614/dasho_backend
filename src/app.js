import express from "express";
import { connectDB,db } from "./utils/db.js";
import adminRouter from "./admin/route.js";
import cors from "cors";
import participantRouter from "./participant/route.js";
import fs from "fs";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 6100;
app.use(express.json());
app.use(express.static("./"));
app.use("/admin", adminRouter);
app.use(cors({origin: '*'}));
app.use("/participant", participantRouter);

async function loadImages(){
  const event=await db.collection("Coding Blocks Kare-Code Striker").find({}).toArray();
  for(let i=0;i<event.length;i++){
      axios.get(
      "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent('https://dasho-backend.onrender.com/participant/user/6901f06be20bc15caec70e21'+"/" + event[i]._id),
      { responseType: 'stream' }
    ).then(response => {
      response.data.pipe(fs.createWriteStream(event[i]._id + 'qrcode.png'));
      console.log('QR code generated for user:', event[i]._id);
    }).catch(error => {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: "Error generating QR code" });
    });

  }
}
let dbInstance = null;
app.get("/", async (req, res) => {
  res.send("Welcome to the Dasho Server!");
}
);
connectDB()
  .then((db) => {
    dbInstance = db;
    console.log("Database connected successfully");
    loadImages()

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
  });

app.get("/", async (req, res) => {
  res.send("Welcome to the Dasho Server!");
});

export default app;
