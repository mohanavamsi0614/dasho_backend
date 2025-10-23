import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

let client;
let db;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  console.log("Connected to MongoDB");

  db = client.db("dasho");
  return db;
}

const UserCollection = () => {
  if (!db) {
    throw new Error(
      "Database not initialized yet. Call connectDB() before using collections."
    );
  }
  return db.collection("users");
};
const OrganizationCollection = () => {
  if (!db) {
    throw new Error(
      "Database not initialized yet. Call connectDB() before using collections."
    );
  }
  return db.collection("organizations");
};

export { connectDB, UserCollection, OrganizationCollection, db };
