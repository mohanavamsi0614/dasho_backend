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
    console.log(body);
    const orgCollection = OrganizationCollection();
    const org = await orgCollection.findOne({ _id:new  mongodb.ObjectId(orgId) });
    console.log(org);
    await db.collection(`${org.orgName}-${body.eventTitle}`).insertOne({"status": "created"});
    const event=await db.collection('events').insertOne({...body,by:org,eventId:org.orgName+'-'+body.eventTitle});
    const updatedOrg = await orgCollection.updateOne(
      { _id: new mongodb.ObjectId(orgId) },
      { $push: { events: { ...body,_id:event.insertedId } } }
      
    );
    const eve=await orgCollection.findOne({ _id:new  mongodb.ObjectId(orgId) });
    res.json({ message: "Event created successfully", event: eve ,org:eve});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/event/:id",async(req,res)=>{
  const {id}=req.params
  const event=await db.collection('events').findOne({_id:new mongodb.ObjectId(id)})
  const event_og=await db.collection(event.eventId).find({}).toArray()
  res.json({event,event_og})
})
adminRouter.post("/event/status/:eventId",async(req,res)=>{
  const {eventId}=req.params
  const {status}=req.body
  await db.collection('events').updateOne({_id:new mongodb.ObjectId(eventId)},{$set:{status:status}})
  const event=await db.collection('events').findOne({_id:new mongodb.ObjectId(eventId)})
  const event_og=await db.collection(event.eventId).find({}).toArray()
  res.json({message:"Event status updated",event,event_og})
})
adminRouter.post("/event/qr/:event",async(req,res)=>{
  const {event} =req.params
  console.log("event param",event)
  const {userId,status,time}=req.body
console.log("userId,status,time",userId,status,time)
const event_g=await db.collection("events").findOne({_id:new mongodb.ObjectId(event)})
console.log("event_g",event_g)
  const ogevent=await db.collection(event_g.eventId)
  const user=await ogevent.findOne({_id:new mongodb.ObjectId(userId)})
  console.log(user)
  if(status=="checkin"){
    await ogevent.updateOne({_id:new mongodb.ObjectId(userId)},{$push:{checkin:time}})
    res.json({message:"Check-in recorded"})
  }
  else{
    await ogevent.updateOne({_id:new mongodb.ObjectId(userId)},{$push:{checkout:time}})
    res.json({message:"Check-out recorded"})
  }
})

adminRouter.post("/attd/:event/:team",async(req,res)=>{
  console.log("Reached attendance endpoint", req.body,req.params);
  const {event,team}=req.params
  const {lead,members}=req.body
  const event_g=await db.collection("events").findOne({_id:new mongodb.ObjectId(event)})
  const ogevent=await db.collection(event_g.eventId)
  const teamData=await ogevent.updateOne({_id:new mongodb.ObjectId(team)},{$set:{lead:lead,members:members}})
  res.json({message:"Attendance recorded",teamData})
})

adminRouter.post("/marks/:event/:team",async(req,res)=>{
  const {event,team}=req.params
  const {marks}=req.body
  const event_g=await db.collection("events").findOne({_id:new mongodb.ObjectId(event)})
  const ogevent=await db.collection(event_g.eventId)
  const teamData=await ogevent.updateOne({_id:team},{$set:{marks:marks}})
  res.json({message:"Marks recorded"})
})

export default adminRouter;
