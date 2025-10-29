import { Router } from "express";
import { UserCollection,db } from "../utils/db.js";
import express from "express";
import mongodb from "mongodb";
import axios from "axios";
import fs from "fs";
import cors from "cors";
import { createTransport } from "nodemailer";

const transporter = createTransport({
host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



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
    const eventData = await db.collection(eventId).find({}).toArray();
    res.json({ eventData });
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
      { _id: userId },
      { $addToSet: { registeredEvents: event } }
    );
    res.json({ message: "User registered for event successfully" });
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
    const user=await userCollection.updateOne(
      { _id: new mongodb.ObjectId(userId) },
      { $addToSet: { registeredEvents: eventData } }
    );
await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: req.body.email,
  subject: `Registration Successful for ${eventData.eventTitle}`,
  html: `
  <div style="font-family: Arial, sans-serif; background-color: #f7f8fa; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 8px rgba(0,0,0,0.1);">
      <div style="background-color: #E16254; padding: 15px; text-align: center; color: white;">
        <h1 style="margin: 0;">${eventData.eventTitle}</h1>
      </div>
      <div style="padding: 25px; text-align: center;">
        <h2 style="color: #000;">Registration Successful 🎉</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hello <strong>${req.body.name || "Participant"}</strong>,<br/>
          You have been successfully registered for <strong>${eventData.eventTitle}</strong>.
        </p>
        <p style="font-size: 15px; color: #444;">
          Please use the attached <strong>QR Code</strong> for event check-in and check-out.
        </p>
        <div style="margin-top: 20px;">
          <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px;" />
        </div>
        <p style="margin-top: 25px; font-size: 14px; color: #888;">
          Thank you for registering!<br/>
          — The Event Team
        </p>
        <img src="https://dasho-backend.onrender.com/${reg_user.insertedId}qrcode.png" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px;" />
      </div>
      <div style="background-color: #ECE8E7; text-align: center; padding: 12px; font-size: 13px; color: #666;">
        <p style="margin: 0;">© ${new Date().getFullYear()} ${eventData.orgName || "Our Organization"}</p>
      </div>
    </div>
  </div>
  `
});
    res.json({ message: "User registered and QR code generated successfully",registrationId:reg_user.insertedId, user });
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
