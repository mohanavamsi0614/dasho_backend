import { Router } from "express";
import { UserCollection } from "../utils/db.js";

const participantRouter = Router();

participantRouter.get("/", (req, res) => {
  res.send("Participant Information");
});

participantRouter.post("/auth", async (req, res) => {
  try {
    const userCollection = UserCollection();
    const { email } = req.body;
    const user = await userCollection.findOne({ email });
    if (!user) {
      await userCollection.insertOne({ ...req.body });
      res.send("Participant Authenticated");
      return;
    }
    res.send("Participant Authenticated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default participantRouter;
