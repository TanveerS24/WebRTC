import { MongoClient, Db } from "mongodb";
import { logger } from "../utils/logger";

let client: MongoClient | null = null;
let database: Db | null = null;

const DB_NAME = "seminar";

// Establish or reuse active MongoDB client connection
export async function connectDb(uri: string): Promise<Db> {
  if (database) {
    return database;
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(DB_NAME);
  logger.info(`Connected to MongoDB Atlas database "${DB_NAME}"`);
  return database;
}

// Access initialized database reference safely
export function getDb(): Db {
  if (!database) {
    throw new Error("Database not initialized. Call connectDb() first.");
  }
  return database;
}

// Closes connection cleanly during graceful shutdown
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
    logger.info("MongoDB client connection closed");
  }
}
