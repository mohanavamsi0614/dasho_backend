import { Router } from "express";
import { UserCollection, db } from "../utils/db.js";
import { ObjectId } from "mongodb";
import axios from "axios";
import fs from "fs";
import cors from "cors";
import { QR_API_URL, BACKEND_URL } from "../config.js";
import { sendPaymentEmail, sendRegistrationEmail } from "../utils/email.js";

const participantRouter = Router();
participantRouter.use(cors({ origin: '*' }));

participantRouter.get("/", (req, res) => {
  res.send("Participant Information");
});

participantRouter.post("/auth", async (req, res) => {
  try {
    const userCollection = UserCollection();
    const { email } = req.body;
    const user = await userCollection.findOne({ email });
    if (!user) {
      res.json({ newUser: true });
    } else {
      res.json({ newUser: false, user });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.post("/register", async (req, res) => {
  try {
    const userCollection = UserCollection();
    const userData = req.body;
    const existingUser = await userCollection.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const result = await userCollection.insertOne(userData);
    const user = await userCollection.findOne({ _id: result.insertedId });
    res.json({ message: "User registered successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.get("/eventdata/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const orgCollection = db.collection('events');
    const eventData = await orgCollection.findOne({ eventId: eventId });
    res.json(eventData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.get("/eventslist", async (req, res) => {
  try {
    const events = await db.collection('events').find({}).toArray();
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.post("/register/hackathon/:event", async (req, res) => {
  try {

    const eventCollection = db.collection('events');
    const { userId } = req.body;
    
    if (!ObjectId.isValid(req.params.event) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }
    
    
    const event = await eventCollection.findOne({ _id: new ObjectId(req.params.event) });
    const userCollection = UserCollection();
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    if(event.status!="open"){
      return res.status(400).json({ error: "Event is not open" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (event.maxTeams <= (event?.teams?.length || 0)) {
      return res.status(400).json({ error: "Event is full" });
    }
    if (!event.eventId) {
      return res.status(500).json({ error: "Event data corrupted: missing eventId" });
    }
    const check=await db.collection(event.eventId).findOne({teamName:req.body.teamName.toLowerCase()})
    if(check){
      return res.status(400).json({ error: "Team name already exists" });
    }
    
    
    const safeLeadName = req.body.lead?.name || "";
    const password = (req.body.teamName?.toLowerCase().slice(1) || "") + 
                     (safeLeadName.replace(/\s/g, "").slice(4) || "");

    const team = await db.collection(event.eventId).insertOne({ 
      ...req.body, 
      userId: userId, 
      userName: user.name, 
      payment: false,
      password: password 
    });
    
    await eventCollection.updateOne(
      { _id: new ObjectId(event._id) }, 
      { $push: { teams: team.insertedId } }
    );
    
    await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { registeredEvents: event } }
    );
    
    const updatedUser = await userCollection.findOne({ _id: new ObjectId(userId) });
    sendPaymentEmail(req.body.lead,event,req.body.teamName,`https://dasho_p.vercel.app/payment/${event.eventId}/${team.insertedId}`)
    res.json({ message: "User registered for event successfully", user: updatedUser,team:team.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.post("/register/qr/:event", async (req, res) => {
  try {
    const userCollection = UserCollection();
    const { event } = req.params;
    const { userId } = req.body;
    
    if (!ObjectId.isValid(event) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }

    const eventCollection = db.collection('events');

    const eventData = await eventCollection.findOne({ _id: new ObjectId(event) });

    if (!eventData) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (!eventData.eventId) {
      return res.status(500).json({ error: "Event data corrupted: missing eventId" });
    }
    
    const existingRegistration = await db.collection(eventData.eventId).findOne({ rollNumber: req.body.rollNumber });
    if (existingRegistration) {
      return res.status(400).json({ error: "User with this roll number already registered" });
    }
    
    const reg_user = await db.collection(eventData.eventId).insertOne({ ...req.body, userId: userId });
    
    const qrCodePath = reg_user.insertedId + 'qrcode.png';
    const qrCodeUrl = QR_API_URL + encodeURIComponent(`${BACKEND_URL}/participant/user/${event}/${reg_user.insertedId}`);
    
    const response = await axios.get(qrCodeUrl, { responseType: 'stream' });
    response.data.pipe(fs.createWriteStream(qrCodePath));
    
    await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { registeredEvents: eventData } }
    );
    
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    
    // Send email asynchronously
    sendRegistrationEmail({ ...req.body, email: req.body.email }, eventData, qrCodePath)
      .catch(err => console.error("Failed to send email:", err));

    res.json({ 
      message: "User registered and QR code generated successfully", 
      registrationId: reg_user.insertedId, 
      user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
participantRouter.get("/payment/hackthon/:eventId/:teamId", async (req, res) => {
  try {
    const { eventId, teamId } = req.params;
    console.log(req.params)
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "Invalid eventId or teamId" });
    }

    const eventCollection = db.collection('events');
    const event = await eventCollection.findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (!event.eventId) {
      return res.status(500).json({ error: "Event data corrupted: missing eventId" });
    }

    const team = await db.collection(event.eventId).findOne({ _id: new ObjectId(teamId) });
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    if(team.payment){
      return res.status(400).json({ error: "Team already paid" });
    }
    
    res.json({ name: event.eventTitle, cost: event.cost, payments: event.payments, team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
participantRouter.post("/payment/hackthon/:eventId/:teamId", async (req, res) => {
  try {
    const { eventId, teamId } = req.params;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "Invalid eventId or teamId" });
    }

    const eventCollection = db.collection('events');
    const event = await eventCollection.findOne({ _id: new ObjectId(eventId) });
    
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (!event.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });

    const team = await db.collection(event.eventId).updateOne(
      { _id: new ObjectId(teamId) },
      { $set: { payment: true, paymentDetails: req.body } }
    );
    res.json({ message: "Payment successful", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
participantRouter.post("/payment/hackthon/:eventId/:teamId", async (req, res) => {
  try {
    const { eventId, teamId } = req.params;
    
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "Invalid eventId or teamId" });
    }

    const eventCollection = db.collection('events');
    const event = await eventCollection.findOne({ _id: new ObjectId(eventId) });
    
    if (!event) return res.status(404).json({ error: "Event not found" });

    const team = await db.collection(event.eventId).updateOne(
      { _id: new ObjectId(teamId) },
      { $set: { payment: true, paymentDetails: req.body } }
    );
    res.json({ message: "Payment successful", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


participantRouter.get("/user/:event/:userId", async (req, res) => {
  try {
    const { event, userId } = req.params;
    
    if (!ObjectId.isValid(event) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }

    const eventCollection = db.collection('events');

    const eventDoc = await eventCollection.findOne({ _id: new ObjectId(event) });
    if (!eventDoc) return res.status(404).json({ error: 'Event not found' });
    if (!eventDoc.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });
    
    const userCollection = db.collection(eventDoc.eventId);
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.get("/team/:event/:pass", async (req, res) => {
  try {
    const { event, pass } = req.params;
    
    if (!ObjectId.isValid(event)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const eventCollection = db.collection('events');
    
    const eventDoc = await eventCollection.findOne({ _id: new ObjectId(event) });
    if (!eventDoc) return res.status(404).json({ error: 'Event not found' });
    if (!eventDoc.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });
    
    const teamCollection = db.collection(eventDoc.eventId);
    const team = await teamCollection.findOne({ teamName: pass });
    
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
participantRouter.get("/dashboard/:event/:pass",async (req,res)=>{
  const {event,pass}=req.params;
  const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
  if (!event_g) return res.status(404).json({ error: "Event not found" });
  if (!event_g.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });
  const team=await db.collection(event_g.eventId).findOne({password:pass});
  if(!team){
    return res.status(404).json({error:"Team not found"});
  }
  res.json({team,attd:event_g.attd,currAttd:event_g.currAttd});
})
participantRouter.post("/attd/:event/:pass",async (req,res)=>{
  const {event,pass}=req.params;
  const {participant,role}=req.body;
  const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
  if (!event_g) return res.status(404).json({ error: "Event not found" });
  if (!event_g.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });
  if(role == "lead"){
    const team=await db.collection(event_g.eventId).updateOne({password:pass},{$set: {lead:participant}});
        const updatedTeam=await db.collection(event_g.eventId).findOne({password:pass});
    return res.json({team:updatedTeam});
  }

    const team=await db.collection(event_g.eventId).findOne({password:pass});
    const members=team.members.map((member)=>{
      if(member.name==participant.name){
        member.attd={...participant.attd};
      }
      return member;
    })
    await db.collection(event_g.eventId).updateOne({password:pass},{$set :{members:members}});
    console.log(updatedTeam)
    return res.json({team:updatedTeam});
  
})
participantRouter.post("/teamlogo/:event/:pass",async (req,res)=>{
  const {event,pass}=req.params;
  const {logo}=req.body;
  const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
  if (!event_g) return res.status(404).json({ error: "Event not found" });
  if (!event_g.eventId) return res.status(500).json({ error: "Event data corrupted: missing eventId" });
  const team=await db.collection(event_g.eventId).updateOne({password:pass},{$set: {logo:logo}});
  return res.json({team});
})
export default participantRouter;