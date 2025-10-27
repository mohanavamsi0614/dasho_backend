const axios = require('axios');
const fs = require('fs');
const {MongoClient}=require('mongodb');
const {ObjectId}=require("mongodb")
const dot=require("dotenv").config()
const client=new MongoClient(process.env.DB_URI);


client.connect()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
const students = client.db("spraks").collection("students").find().toArray().then((students)=>{

for(let i of students.slice(students.length-100,students.length+1)){
axios.get(
  'https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURIComponent('https://vishaka-server.onrender.com/qr/'+i._id) + '&size=200x200',
  { responseType: 'stream' }
).then(response => {
  // Write response data (as a stream) directly to a file
  response.data.pipe(fs.createWriteStream(i._id + 'qrcode.png'));

  response.data.on('end', () => {
    console.log('QR Code image saved as ' + i._id + 'qrcode.png');
  });
  response.data.on('error', err => {
    console.error('Error writing QR Code image:', err);
  });
}).catch(error => {
  console.error('Error generating QR code:', error);
});
}
})