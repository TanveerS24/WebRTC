import type { Db } from "mongodb";
import { logger } from "../utils/logger";

// Ensures required unique, TTL, and lookup indexes exist at startup
export async function createIndexes(db: Db): Promise<void> {
  // 1. rooms: unique index on code; TTL index on expiresAt (rooms live 6 hours)
  const rooms = db.collection("rooms");
  await rooms.createIndex({ code: 1 }, { unique: true });
  await rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // 2. updates: fast lookup by roomCode
  const updates = db.collection("updates");
  await updates.createIndex({ roomCode: 1, createdAt: 1 });

  // 3. polls: fast lookup by roomCode
  const polls = db.collection("polls");
  await polls.createIndex({ roomCode: 1 });

  // 4. votes: unique compound index on (pollId, clientId) to enforce one vote per person
  const votes = db.collection("votes");
  await votes.createIndex({ pollId: 1, clientId: 1 }, { unique: true });

  logger.info("Database indexes successfully initialized");
}
