import type { UpdateRepo } from "../repositories/updateRepo";
import type { RoomRepo } from "../repositories/roomRepo";
import type { UpdateItem } from "../protocol/messages";

export interface UpdateService {
  postUpdate(roomCode: string, text: string): Promise<UpdateItem>;
  getUpdates(roomCode: string): Promise<UpdateItem[]>;
}

// Update service handles creation and retrieval of broadcasted updates
export function createUpdateService(deps: {
  updateRepo: UpdateRepo;
  roomRepo: RoomRepo;
}): UpdateService {
  const { updateRepo, roomRepo } = deps;

  return {
    async postUpdate(roomCode: string, text: string): Promise<UpdateItem> {
      // Validate that room exists and has not expired
      const room = await roomRepo.findByCode(roomCode);
      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }

      const record = await updateRepo.insert({
        roomCode,
        text,
        createdAt: new Date(),
      });

      return {
        id: record.id,
        text: record.text,
        createdAt: record.createdAt.toISOString(),
      };
    },

    async getUpdates(roomCode: string): Promise<UpdateItem[]> {
      const records = await updateRepo.findByRoomCode(roomCode);
      return records.map((r) => ({
        id: r.id,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  };
}
