import { Router } from "express";
import mongodb from "mongodb";
import { OrganizationCollection,db } from "../utils/db.js";
import express from "express";
import cors from "cors";


const adminRouter = Router();
adminRouter.use(express.json());
adminRouter.use(cors({origin: '*'}));

adminRouter.post("/auth", async (req, res) => {
  try {
    const orgCollection = OrganizationCollection();
    const org = await orgCollection.findOne({ email: req.body.email });
    if (!org) {
      res.json({ newOrg: true });
    } else {
      res.json({ newOrg: false, org });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/register", async (req, res) => {
  try {
    const orgCollection = OrganizationCollection();
    const orgData = req.body;
    const existingOrg = await orgCollection.findOne({ email: orgData.email });
    if (existingOrg) {
      return res.status(400).json({ error: "Organization already exists" });
    }
    const result = await orgCollection.insertOne(orgData);
    const org = await orgCollection.findOne({ _id: result.insertedId });
    res.json({ message: "Organization registered successfully", org });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/event", async (req, res) => {
  try {
    const {body}= req;
    const {orgId}= req.body;
    console.log(body  );
    const orgCollection = OrganizationCollection();
    const org = await orgCollection.findOne({ _id:new  mongodb.ObjectId(orgId) });
    console.log(org);
    await db.collection(`${org.orgName}-${body.eventTitle}`).insertOne({"status": "created"});
    await db.collection('events').insertOne({...body,by:orgId,eventId:org.orgName+'-'+body.eventTitle});
    const updatedOrg = await orgCollection.updateOne(
      { _id: new mongodb.ObjectId(orgId) },
      { $push: { events: body } }
    );
    res.json({ message: "Event created successfully", event: body ,org:updatedOrg});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/event/qr/:event",async(req,res)=>{
  const {event} =req.params
  const {useId,status,time}=req.body

  const ogevent=await db.collection(event)
  const user=await ogevent.findOne({_id:new mongodb.ObjectId(useId)})

  if(status=="checkin"){
    await user.updateOne({_id:new mongodb.ObjectId(useId)},{$push:{checkin:time}})
  }
  else{
    await user.updateOne({_id:new mongodb.ObjectId(useId)},{$push:{checkout:time}})
  }


})
export default adminRouter;
