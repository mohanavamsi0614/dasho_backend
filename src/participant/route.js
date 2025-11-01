import { Router } from "express";
import { UserCollection,db } from "../utils/db.js";
import express from "express";
import mongodb from "mongodb";
import axios from "axios";
import fs from "fs";
import cors from "cors";




const participantRouter = Router();
participantRouter.use(express.json());
participantRouter.use(cors({origin: '*'}));
participantRouter.get("/", (req, res) => {
  res.send("Participant Information");
});

const QR_API="https://api.qrserver.com/v1/create-qr-code/?data=";

participantRouter.post("/auth", async (req, res) => {
  try {
    const userCollection = UserCollection();
    console.log(req.body);
    const { email } = req.body;
    const user = await userCollection.findOne({ email });
    if (!user) {
      res.json({ newUser: true });
    } else {
      res.json({ newUser: false, user});
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
    const existingUser = await userCollection

      .findOne({ email: userData.email });
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
    const {eventId}= req.params;
    const orgCollection = db.collection('events');
    const eventData = await orgCollection.findOne({ eventId: eventId });
    res.json( eventData );
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
    const event = await eventCollection.findOne({ _id: new mongodb.ObjectId(req.params.event) });
    const userCollection = UserCollection();
    const user = await userCollection.findOne({ _id: new mongodb.ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await db.collection(event.eventId).insertOne({ ...req.body, userId: userId, userName: user.name });
    await userCollection.updateOne(
      { _id: new mongodb.ObjectId(userId) },
      { $addToSet: { registeredEvents: event } }
    );
    const user_=await userCollection.findOne({ _id: new mongodb.ObjectId(userId) });
        res.json({ message: "User registered for event successfully", user: user_ });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
participantRouter.post("/register/qr/:event", async (req, res) => {
  console.log("Reached QR registration endpoint", req.body,req.params);
  try{
    const userCollection = UserCollection();
    const { event } = req.params;
    const { userId } = req.body;
    const eventCollection = db.collection('events');

    const eventData = await eventCollection.findOne({ _id: new mongodb.ObjectId(event) });

    if (!eventData) {
      return res.status(404).json({ error: "Event not found" });
    }
    const exit=await db.collection(eventData.eventId).findOne({rollNumber:req.body.rollNumber});
    if(exit){
      return  res.status(400).json({ error: "User with this roll number already registered" });
    }
    const reg_user=await db.collection(eventData.eventId).insertOne({...req.body, userId: userId });
     
    axios.get(
      QR_API + encodeURIComponent('https://dasho-backend.onrender.com/participant/user/'+event+"/" + reg_user.insertedId),
      { responseType: 'stream' }
    ).then(response => {
      response.data.pipe(fs.createWriteStream(reg_user.insertedId + 'qrcode.png'));
    }).catch(error => {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: "Error generating QR code" });
    });
    await userCollection.updateOne(
      { _id: new mongodb.ObjectId(userId) },
      { $addToSet: { registeredEvents: eventData } }
    );
    const user=await userCollection.findOne({ _id: new mongodb.ObjectId(userId) });
    axios.post("https://7feej0sxm3.execute-api.eu-north-1.amazonaws.com/default/mail_sender",{
      to:req.body.email,
      subject:`Registration Successful for ${eventData.eventTitle}`,
      html: `
<div style="font-family: Arial, sans-serif; background-color: #000000; padding: 20px; color: #FFFFFF;">
  <div style="max-width: 600px; margin: auto; background: #111111; border-radius: 12px; overflow: hidden; box-shadow: 0 0 15px rgba(255,255,255,0.1);">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 18px; text-align: center; border-bottom: 1px solid #222;">
      <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
        <a href="https://dashoo-p.vercel.app/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 25px; text-align: center; color: #E0E0E0;">
      <h2 style="color: #FFFFFF;">Registration Successful 🎉</h2>
      <p style="font-size: 16px; margin-bottom: 20px; color: #CCCCCC;">
        Hello <strong style="color: #FFFFFF;">${req.body.name || "Participant"}</strong>,<br/>
        You have been successfully registered for <strong style="color: #FFFFFF;">${eventData.eventTitle}</strong>.
      </p>
      <p style="font-size: 15px; color: #BBBBBB;">
        Please use the attached <strong style="color: #FFFFFF;">QR Code</strong> for event check-in and check-out.
      </p>
      <div style="margin-top: 20px;">
        <img src="https://dasho-backend.onrender.com/${reg_user.insertedId}qrcode.png" 
             alt="QR Code" 
             style="width: 180px; height: 180px; border-radius: 8px; border: 2px solid #FFFFFF;" />
      </div>
      <p style="margin-top: 25px; font-size: 14px; color: #888;">
        Thank you for registering!<br/>
        — The Dasho Event Team
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #000000; border-top: 1px solid #222; text-align: center; padding: 12px; font-size: 13px; color: #777;">
      <p style="margin: 0;">
        © ${new Date().getFullYear()} <a href="https://dashoo-p.vercel.app/" target="_blank" style="color: #FFFFFF; text-decoration: none;">Dasho</a>
      </p>
    </div>
  </div>
</div>
  `}).then(response => {
      console.log('Email sent successfully:', response.data);
      res.json({ message: "User registered and QR code generated successfully",registrationId:reg_user.insertedId, user });
    }).catch(error => {
      console.error('Error sending email:', error);
    });
  }
  catch(err){
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

participantRouter.get("/user/:event/:userId", async (req, res) => {
  try {
    const { event, userId } = req.params;
        const eventCollection = db.collection('events');

    console.log("Fetching user data for event:", event, "and userId:", userId);
  const eventDoc = await eventCollection.findOne({ _id: new mongodb.ObjectId(event) });
  if (!eventDoc) return res.status(404).json({ error: 'Event not found' });
  const userCollection = db.collection(eventDoc.eventId);
  const user = await userCollection.findOne({ _id: new mongodb.ObjectId(userId) });
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
  const {pass}=req.params;
  try {
    const eventCollection = db.collection('events');
    const { event } = req.params;
    console.log("Fetching team data for event:", event, "and pass:", pass);
    const eventDoc = await eventCollection.findOne({ _id: new mongodb.ObjectId(event) });
    if (!eventDoc) return res.status(404).json({ error: 'Event not found' });
    const teamCollection = db.collection(eventDoc.eventId);
    const team = await teamCollection.findOne({ teamName: pass });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default participantRouter;
