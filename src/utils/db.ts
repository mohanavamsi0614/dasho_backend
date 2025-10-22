import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

let client: MongoClient;
let db: Db;

async function connectDB(): Promise<Db> {
  if (db) return db; 

  client = new MongoClient(uri!);
  await client.connect();
  console.log("Connected to MongoDB");

  db = client.db("dasho");
  return db;
}

const UserCollection = () => {
  return db.collection("users");
}

export { connectDB, UserCollection ,db};
