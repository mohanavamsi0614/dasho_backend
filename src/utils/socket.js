import { Server } from "socket.io";
import { db } from "./db.js";
import { ObjectId } from "mongodb";

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("a user connected");
        socket.on("disconnect", () => {
            console.log("user disconnected");
        });
        socket.on("join",(data)=>{
            console.log(socket.id +"connected to "+data.join(" "))
            socket.join(data)
        })
        socket.on("openEvent",async (data)=>{
            console.log(data)
            await db.collection("events").updateOne({_id:new ObjectId(data)},{$set:{status:"open"}})
            io.to(data).emit("eventOpen","event opened")
        })
        socket.on("closeEvent",async (data)=>{
            await db.collection("events").updateOne({_id:new ObjectId(data)},{$set:{status:"closed"}})
            io.to(data).emit("eventClosed","event closed")
        })
        socket.on("regCheck",async (data)=>{
            const {eventId}=data;
            const event=await db.collection(eventId).findOne({_id:new ObjectId(eventId)})
            if(event.maxTeams<=event.teams.length){
                await db.collection("events").updateOne({_id:new ObjectId(eventId)},{$set:{status:"closed"}})
                io.to(eventId).emit("eventClosed","event closed")
            }
        })
        socket.on("currAttd",async (eventId)=>{
            console.log(eventId)
            const event=await db.collection("events").findOne({_id:new ObjectId(eventId)})
            io.to(eventId).emit("currAttd",event.currAttd)
        })
        socket.on("changeAttd",(id,eventId)=>{
            console.log(id,eventId)
            db.collection("events").updateOne({_id:new ObjectId(eventId)},{$set:{currAttd:id}})
            io.to(eventId).emit("currAttd",id)
        })
        socket.on("attd",async (data)=>{
            const {event,team,lead,members}=data
            const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
            const ogevent = await db.collection(event_g.eventId);
            await ogevent.updateOne({ _id: new ObjectId(team) }, { $set: {lead,members } });
            const teamData =await ogevent.findOne({_id:new ObjectId(team)})
            io.to(team).emit("attd",teamData);
        })
    })

    
    console.log("Socket.IO initialized");
    return io;
};