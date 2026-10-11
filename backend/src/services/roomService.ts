import { generateRoomCode, generateHostToken, hashHostToken } from "../utils/codeGenerator";
import type { RoomRepo } from "../repositories/roomRepo";
import type { UpdateRepo } from "../repositories/updateRepo";
import type { UpdateItem } from "../protocol/messages";

export interface CreateRoomResult {
  code: string;
  hostToken: string;
}

export interface RoomService {
  createRoom(): Promise<CreateRoomResult>;
  roomExists(code: string): Promise<boolean>;
  verifyHost(code: string, hostToken?: string): Promise<boolean>;
  getRoomHistory(code: string): Promise<UpdateItem[]>;
}

// Room service coordinates room creation, lifecycle, and host verification
export function createRoomService(deps: {
  roomRepo: RoomRepo;
  updateRepo: UpdateRepo;
}): RoomService {
  const { roomRepo, updateRepo } = deps;

  return {
    async createRoom(): Promise<CreateRoomResult> {
      const maxRetries = 10;
      // Rely on unique index on code with retries to prevent race conditions
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const code = generateRoomCode();
        const hostToken = generateHostToken();
        const hostTokenHash = hashHostToken(hostToken);
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000); // 6-hour TTL

        const inserted = await roomRepo.insert({
          code,
          hostTokenHash,
          createdAt,
          expiresAt,
        });

        if (inserted) {
          return { code, hostToken };
        }
      }
      throw new Error("ROOM_ALLOCATION_FAILED");
    },

    async roomExists(code: string): Promise<boolean> {
      const room = await roomRepo.findByCode(code);
      return room !== null;
    },

    async verifyHost(code: string, hostToken?: string): Promise<boolean> {
      if (!hostToken) {
        return false;
      }
      const room = await roomRepo.findByCode(code);
      if (!room) {
        return false;
      }
      return hashHostToken(hostToken) === room.hostTokenHash;
    },

    async getRoomHistory(code: string): Promise<UpdateItem[]> {
      const records = await updateRepo.findByRoomCode(code);
      return records.map((r) => ({
        id: r.id,
        text: r.text,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  };
}
