import type { Db, Collection } from "mongodb";
import type { RoomDoc } from "../models/room";

export interface RoomRepo {
  insert(room: RoomDoc): Promise<boolean>;
  findByCode(code: string): Promise<RoomDoc | null>;
}

// Room repository encapsulates MongoDB operations for the rooms collection
export function createRoomRepo(db: Db): RoomRepo {
  const collection: Collection<RoomDoc> = db.collection<RoomDoc>("rooms");

  return {
    async insert(room: RoomDoc): Promise<boolean> {
      try {
        await collection.insertOne(room);
        return true;
      } catch (err: unknown) {
        // Return false on duplicate-key error (MongoDB code 11000) so caller can retry
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: number }).code === 11000
        ) {
          return false;
        }
        throw err;
      }
    },

    async findByCode(code: string): Promise<RoomDoc | null> {
      return collection.findOne({ code });
    },
  };
}
