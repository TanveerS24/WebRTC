import type { PollRepo } from "../repositories/pollRepo";
import type { RoomRepo } from "../repositories/roomRepo";
import type { PollState, PollOption } from "../protocol/messages";

export interface PollService {
  createPoll(roomCode: string, question: string, options: string[]): Promise<PollState>;
  getActivePoll(roomCode: string): Promise<PollState | null>;
  closePoll(pollId: string): Promise<PollState | null>;
  recordVote(pollId: string, clientId: string, optionId: string): Promise<{ options: PollOption[]; total: number }>;
}

export function createPollService(deps: {
  pollRepo: PollRepo;
  roomRepo: RoomRepo;
}): PollService {
  const { pollRepo, roomRepo } = deps;

  return {
    async createPoll(roomCode: string, question: string, options: string[]): Promise<PollState> {
      const room = await roomRepo.findByCode(roomCode);
      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }
      return pollRepo.createPoll({ roomCode, question, options });
    },

    async getActivePoll(roomCode: string): Promise<PollState | null> {
      return pollRepo.findActiveByRoomCode(roomCode);
    },

    async closePoll(pollId: string): Promise<PollState | null> {
      return pollRepo.closePoll(pollId);
    },

    async recordVote(
      pollId: string,
      clientId: string,
      optionId: string
    ): Promise<{ options: PollOption[]; total: number }> {
      return pollRepo.recordVote(pollId, clientId, optionId);
    },
  };
}
