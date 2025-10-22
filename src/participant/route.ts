import { Router } from "express";

const partisipantRouter = Router();

partisipantRouter.get("/", (req, res) => {
  res.send("Participant Information");
});

export default partisipantRouter;