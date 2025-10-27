import express from "express";
import { connectDB } from "./utils/db.js";
import adminRouter from "./admin/route.js";
import cors from "cors";
import participantRouter from "./participant/route.js";

const app = express();
const PORT = process.env.PORT || 6100;

app.use(express.json());
app.use("/admin", adminRouter);
app.use(cors({origin: '*'}));
app.use("/participant", participantRouter);

let dbInstance = null;
app.get("/", async (req, res) => {
  res.send("Welcome to the Dasho Server!");
}
);
connectDB()
  .then((db) => {
    dbInstance = db;
    console.log("Database connected successfully");

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
