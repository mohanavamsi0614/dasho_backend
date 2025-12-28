import { Server } from "socket.io";
import { db } from "./db.js";
import cache from "../cache/inmemory_cache.js";
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
            socket.join(data)
        })
        socket.on("openEvent",async (data)=>{
            console.log(data)
            await db.collection("events").updateOne({_id:new ObjectId(data)},{$set:{status:"open"}})
            
            // Invalidate/Update cache
            const cachedEvent = cache.get(`event_${data}`); // Note: data is _id, but cache uses eventId usually? 
            // Wait, previous cache usage in participant/route.js was `event_${eventId}` (string ID)
            // Here `data` seems to be `_id` (ObjectId string). P.S: In participant/route.js `eventId` is a string field "org-eventTitle".
            // But here `updateOne( {_id: ...} )`. 
            // I need to be careful about which ID is being used for the cache key.
            // participant/route.js: cache.get(`event_${eventId}`) where eventId came from req.params.eventId (likely the custom string ID).
            // socket.js: `data` is used as `_id`.
            // So if I invalidating, I might need to find the event to get its `eventId`.
            
            const event = await db.collection("events").findOne({_id: new ObjectId(data)});
            if (event && event.eventId) {
                 cache.del(`event_${event.eventId}`);
            }
            cache.del("all_events");

            io.to(data).emit("eventOpen","event opened")
        })
        socket.on("closeEvent",async (data)=>{
            await db.collection("events").updateOne({_id:new ObjectId(data)},{$set:{status:"closed"}})
            
             const event = await db.collection("events").findOne({_id: new ObjectId(data)});
            if (event && event.eventId) {
                 cache.del(`event_${event.eventId}`);
            }
            cache.del("all_events");

            io.to(data).emit("eventClosed","event closed")
        })
        socket.on("regCheck",async (data)=>{
            const {eventId}=data;
            console.log(data)
            
            // Try to get from cache? 
            // Here eventId is passed. Is it _id or eventId?
            // "findOne({_id:new ObjectId(eventId)})" implies it is _id.
            
            let event = await db.collection("events").findOne({_id:new ObjectId(eventId)});
            
            // If I want to cache this, I'd need to cache by _id too, or lookup by _id.
            // For now, I will just optimize the 'event.teams.length' check if possible, 
            // but since we are modifying status if full, we probably want fresh data. 
            // However, we can at least invalidate if we close it.
            
            if(event.maxTeams<=event.teams.length){
                await db.collection("events").updateOne({_id:new ObjectId(eventId)},{$set:{status:"closed"}})
                
                if (event.eventId) {
                    cache.del(`event_${event.eventId}`);
                }
                cache.del("all_events");

                io.to(eventId).emit("eventClosed","event closed")
            }
        })
        socket.on("currAttd",async (data)=>{
            // data.eventId is _id based on usage in `changeAttd`? 
            // In changeAttd: `_id:new ObjectId(eventId)`
            // Here: `_id:new ObjectId(data.eventId)`
             let currAttd = cache.get(`currAttd_${data.eventId}`);
             if (!currAttd) {
                const event = await db.collection("events").findOne({_id:new ObjectId(data.eventId)});
                currAttd = event ? (event.currAttd || "") : "";
                cache.put(`currAttd_${data.eventId}`, currAttd);
             }
            io.to(data.teamId).emit("currAttd",currAttd)
        })
        socket.on("changeAttd",(id,eventId)=>{
            db.collection("events").updateOne({_id:new ObjectId(eventId)},{$set:{currAttd:id}})
            cache.put(`currAttd_${eventId}`, id);
            
            // Also invalidate event object cache if it contains currAttd?
             // The event object in participant/route.js might contain it.
             // We need to fetch the event to know its 'eventId' string to invalidate `event_${eventId}` key.
             
             db.collection("events").findOne({_id:new ObjectId(eventId)}).then(event => {
                 if (event && event.eventId) {
                     cache.del(`event_${event.eventId}`);
                 }
             });

            io.to(eventId).emit("currAttd",id)
        })
        socket.on("attd",async (data)=>{
            const {event,team,lead,members}=data
            console.log(data)
            const event_g = await db.collection("events").findOne({ _id: new ObjectId(event) });
            const ogevent = await db.collection(event_g.eventId);
            await ogevent.updateOne({ _id: new ObjectId(team) }, { $set: {lead,members } });
            const teamData =await ogevent.findOne({_id:new ObjectId(team)})
            io.to(team).emit("attd",teamData);
        })
        socket.on("update",(data)=>{
            console.log(data)
            db.collection("events").updateOne({_id:new ObjectId(data.id)},{$set:{update:data.update}})
            io.to(data.id).emit("updateOn",data.update)
        })
        socket.on("getUpdate",async (data)=>{
            const update=await db.collection("events").findOne({_id:new ObjectId(data.eventId)}) 
            io.to(data.teamId).emit("updateOn",update.update)
        })
    })

    
    console.log("Socket.IO initialized");
    return io;
};