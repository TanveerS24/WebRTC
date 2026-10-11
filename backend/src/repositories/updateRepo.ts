import type { Db, Collection, WithId } from "mongodb";
import type { UpdateDoc } from "../models/update";

export interface UpdateRecord {
  id: string;
  roomCode: string;
  text: string;
  createdAt: Date;
}

export interface UpdateRepo {
  insert(update: UpdateDoc): Promise<UpdateRecord>;
  findByRoomCode(roomCode: string, limit?: number): Promise<UpdateRecord[]>;
}

// Update repository encapsulates MongoDB operations for updates
export function createUpdateRepo(db: Db): UpdateRepo {
  const collection: Collection<UpdateDoc> = db.collection<UpdateDoc>("updates");

  return {
    async insert(update: UpdateDoc): Promise<UpdateRecord> {
      const res = await collection.insertOne(update);
      return {
        id: res.insertedId.toString(),
        roomCode: update.roomCode,
        text: update.text,
        createdAt: update.createdAt,
      };
    },

    async findByRoomCode(roomCode: string, limit = 50): Promise<UpdateRecord[]> {
      const docs: WithId<UpdateDoc>[] = await collection
        .find({ roomCode })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      // Return updates in chronological order (oldest to newest)
      return docs
        .reverse()
        .map((doc) => ({
          id: doc._id.toString(),
          roomCode: doc.roomCode,
          text: doc.text,
          createdAt: doc.createdAt,
        }));
    },
  };
}
