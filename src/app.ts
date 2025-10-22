import express, { Request, Response } from "express";
import { connectDB } from "./utils/db.js";
import { Db } from "mongodb";
import adminRouter from "./admin/route.js"
import participantRouter from "./participant/route.js"
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/admin", adminRouter);
app.use("/participant", participantRouter);

let dbInstance: Db | null = null;

connectDB()
  .then((db: Db) => {
    dbInstance = db;
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error("Database connection failed", err);
  });

app.get("/", async (req: Request, res: Response) => {
  res.send("Welcome to the Dasho Server!");
});


