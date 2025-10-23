import { Router } from "express";
import { OrganizationCollection } from "../utils/db.js";

const adminRouter = Router();

adminRouter.get("/", (req, res) => {
  res.send("Admin Dashboard");
});

adminRouter.post("/auth ", async (req, res) => {
  try {
    const organizationCollection = OrganizationCollection();
    const { email } = req.body;
    const organization = await organizationCollection.findOne({ email });
    if (organization) {
      res.send("Organization Authenticated");
      return;
    }
    await organizationCollection.insertOne({ ...req.body });
    res.status(201).send("Organization Authenticated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default adminRouter;
