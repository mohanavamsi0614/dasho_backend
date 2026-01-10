import { Router } from "express";
import { OrganizationCollection, db } from "../utils/db.js";
import { ObjectId } from "mongodb";
import cors from "cors";
import { sendWelcomeEmail, sendRegistrationEmail, sendPaymentEmail } from "../utils/email.js";
import cache from "../cache/inmemory_cache.js";
import { QR_API_URL, BACKEND_URL } from "../config.js";
import axios from "axios";
import fs from "fs";
import cloudinary from "cloudinary";

cloudinary.v2.config({
    cloud_name: "dus9hgplo",
    api_key: "425457398647798",
    api_secret: "iwQUejWLH6PHPa5uPX_E96jw-lc"
})

const adminRouter = Router();
adminRouter.use(cors({ origin: '*' }));

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
adminRouter.post("/payment/hackthon/verify/:eventId/:userId", async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const {members,teamName}=req.body;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid eventId or userId" });
    }

    const eventCollection = db.collection('events');
    const event = await eventCollection.findOne({ _id: new ObjectId(eventId) });
    
    if (!event) return res.status(404).json({ error: "Event not found" });

    const user = await db.collection(event.eventId).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { verified:true } }
    );
    sendWelcomeEmail(members,event,teamName)
    res.json({ message: "verifed successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.post("/payment_remider/:event/:userId",async (req,res)=>{
  try {
    const {event,userId}=req.params;
    const eventCollection=db.collection('events');
    const eventdata=await eventCollection.findOne({_id:new ObjectId(event)})
    const email=await db.collection(eventdata.eventId).findOne({_id:new ObjectId(userId)})
    console.log(email)
    sendPaymentEmail(email.lead,eventdata,email.lead.email,email.teamName,`https://dasho_p.vercel.app/payment/${eventdata._id}/${email._id}`)
    res.json({message:"Payment reminder sent successfully"})
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Server error"})
    
  }
})

adminRouter.post("/payment/add/:eventId",async (req,res)=>{
  try {
    const {eventId}=req.params;
    const eventCollection=db.collection('events');
    const event=await eventCollection.findOne({_id:new ObjectId(eventId)})
    const payment=await eventCollection.updateOne({
      _id:new ObjectId(eventId)
    },{
      $push:{payments:req.body}
    })
    res.json({message:"Payment added successfully",payment})
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Server error"})
  }
})

adminRouter.put("/team/update/:eventId/:teamId",async(req,res)=>{
  try {
    const {eventId,teamId}=req.params;
    const event_id=await db.collection("events").findOne({_id:new ObjectId(eventId)})
    const eventCollection=db.collection(event_id.eventId)
    const team=await eventCollection.updateOne({
      _id:new ObjectId(teamId)
    },{
      $set:{...req.body}
    })
    res.json({message:"Team updated successfully",team})
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Server error"})
  }
})
adminRouter.put("/payment/update/:eventId",async(req,res)=>{
  try {
    const {eventId}=req.params;
    const eventCollection=await db.collection("events")
    const payment=await eventCollection.updateOne({
      _id:new ObjectId(eventId)
    },{
      $set:{payments:req.body}
    })
    res.json({message:"Payment updated successfully",payment})
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Server error"})
  }
})

adminRouter.delete("/team/delete/:eventId/:teamId",async(req,res)=>{
  try {
    const {eventId,teamId}=req.params;
    const event_id=await db.collection("events").findOne({_id:new ObjectId(eventId)})
    const team=await db.collection(event_id.eventId).findOne({_id:new ObjectId(teamId)})
    const event=await db.collection(event_id.eventId).deleteOne({_id:new ObjectId(teamId)})
    res.json({message:"Team deleted successfully",event})
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Server error"})
  }
})

adminRouter.post("/payment/qr/verify/:eventId/:userId", async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid eventId or userId" });
    }

    const eventCollection = db.collection('events');
    const eventData = await eventCollection.findOne({ _id: new ObjectId(eventId) });
    
    if (!eventData) return res.status(404).json({ error: "Event not found" });

    const user = await db.collection(eventData.eventId).findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.collection(eventData.eventId).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { verified: true } }
    );

    const qrCodeUrl = QR_API_URL + encodeURIComponent(`${BACKEND_URL}/participant/user/${eventId}/${userId}`);
    const img=await axios.get(qrCodeUrl,{responseType:'arraybuffer'})
    const qrCodeBuffer=Buffer.from(img.data,'binary')
    const qrCodePath = user._id + 'qrcode.png';
    fs.writeFileSync(qrCodePath,qrCodeBuffer)
    const em_qrCodeUrl = await cloudinary.v2.uploader.upload(qrCodePath, { folder: 'qrcodes' })
    sendRegistrationEmail({ ...user, email: user.email }, eventData, em_qrCodeUrl.secure_url)
    res.json({ message: "Verified successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.post("/hackthon/round/create/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { round } = req.body;
    
    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid eventId" });
    }
    
    const eventCollection = db.collection('events');
    const event = await eventCollection.updateOne({ _id: new ObjectId(eventId) }, { $push: { rounds:req.body.round } }, { upsert: true });
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    res.json({ message: "Round created successfully", round });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.put("/hackthon/round/update/:eventId/:roundId", async (req, res) => {
  try {
    const { eventId, roundId } = req.params;
    const { round } = req.body;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(roundId)) {
      return res.status(400).json({ error: "Invalid eventId or roundId" });
    }
    
    const eventCollection = db.collection('events');
    const event = await eventCollection.updateOne({ _id: new ObjectId(eventId), "rounds._id": new ObjectId(roundId) }, { $set: { "rounds.$": { round } } });
    if (!event) return res.status(404).json({ error: "Event or round not found" });
    
    res.json({ message: "Round updated successfully", round });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.delete("/hackthon/round/delete/:eventId/:roundId", async (req, res) => {
  try {
    const { eventId, roundId } = req.params;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(roundId)) {
      return res.status(400).json({ error: "Invalid eventId or roundId" });
    }
    
    const eventCollection = db.collection('events');
    const event = await eventCollection.updateOne({ _id: new ObjectId(eventId) }, { $pull: { rounds: { _id: new ObjectId(roundId) } } });
    if (!event) return res.status(404).json({ error: "Event or round not found" });
    
    res.json({ message: "Round deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.post("/event", async (req, res) => {
  try {
    const { body } = req;
    const { orgId } = req.body;
    
    if (!ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: "Invalid orgId" });
    }

    const orgCollection = OrganizationCollection();
    const org = await orgCollection.findOne({ _id: new ObjectId(orgId) });
    
    await db.collection(`${org.orgName.split(" ").join("_")}-${body.eventTitle.split(" ").join("_")}`).insertOne({ "status": "created" });
    const event = await db.collection('events').insertOne({ ...body, by: org, eventId: org.orgName.split(" ").join("_") + '-' + body.eventTitle.split(" ").join("_") });
    
    await orgCollection.updateOne(
      { _id: new ObjectId(orgId) },
      { $push: { events: { ...body, _id: event.insertedId } } }
    );
    
    const eve = await orgCollection.findOne({ _id: new ObjectId(orgId) });
    cache.del("all_events");
    res.json({ message: "Event created successfully", event: eve, org: eve });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/event/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    const event_og = await db.collection(event.eventId).find({}).toArray();
    res.json({ event, event_og });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/event/status/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    
    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid eventId" });
    }

    await db.collection('events').updateOne({ _id: new ObjectId(eventId) }, { $set: { status: status } });
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (event && event.eventId) {
        cache.del(`event_${event.eventId}`);
    }
    cache.del("all_events");
    const event_og = await db.collection(event.eventId).find({}).toArray();
    res.json({ message: "Event status updated", event, event_og });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/event/qr/:event", async (req, res) => {
  try {
    const { event } = req.params;
    const { userId, status, time } = req.body;
    
    if (!ObjectId.isValid(event) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }
    
    const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
    if (!event_g) return res.status(404).json({ error: "Event not found" });
    
    const ogevent = await db.collection(event_g.eventId);
    
    if (status == "checkin") {
      await ogevent.updateOne({ _id: new ObjectId(userId) }, { $push: { checkin: time } });
      res.json({ message: "Check-in recorded" });
    } else {
      await ogevent.updateOne({ _id: new ObjectId(userId) }, { $push: { checkout: time } });
      res.json({ message: "Check-out recorded" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/marks/:event/:team", async (req, res) => {
  try {
    const { event, team } = req.params;
    const { marks } = req.body;
    
    if (!ObjectId.isValid(event) || !ObjectId.isValid(team)) {
      return res.status(400).json({ error: "Invalid event ID or team ID" });
    }

    const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
    if (!event_g) return res.status(404).json({ error: "Event not found" });
    
    const ogevent = await db.collection(event_g.eventId);
    await ogevent.updateOne({ _id: new ObjectId(team) }, { $push: { marks: marks } });
    res.json({ message: "Marks recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/hack/attd/create/:event",async(req,res)=>{
    try {
        const {event}=req.params;
        const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
        if(event_g.attd){
            event_g.attd.push(`attd_${event_g.attd.length+1}`)
        }
        else{
        event_g.attd=[`attd_1`]
        }
        await db.collection("events").updateOne({ _id: new ObjectId(event) }, { $set: { attd: event_g.attd } });
        res.json({message:"Attendance created successfully",event:event_g})
    } catch (error) {
        console.log(error)
        res.json({message:"Attendance not created"})
    }
})
adminRouter.post("/hack/attd/:event/:team",async(req,res)=>{
    try {
        const {event,team}=req.params;
        const {lead,members}=req.body;
        const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
        const ogevent = await db.collection(event_g.eventId);
        const teamData = await ogevent.updateOne({ _id: new ObjectId(team) }, { $set: {lead,members } });
        res.json({ message: "Attendance recorded", teamData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
})
export default adminRouter;
