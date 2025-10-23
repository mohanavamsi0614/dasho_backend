import { Router } from "express";

const participantRouter = Router();

participantRouter.get("/", (req, res) => {
  res.send("Participant Information");
});

export default participantRouter;
