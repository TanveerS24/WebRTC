import { ObjectId, type Db, type Collection, MongoServerError } from "mongodb";
import type { PollDoc, PollOptionDoc } from "../models/poll";
import type { VoteDoc } from "../models/vote";
import type { PollState, PollOption } from "../protocol/messages";

export interface CreatePollParams {
  roomCode: string;
  question: string;
  options: string[];
}

export interface PollRepo {
  createPoll(params: CreatePollParams): Promise<PollState>;
  findActiveByRoomCode(roomCode: string): Promise<PollState | null>;
  findById(id: string): Promise<PollState | null>;
  closePoll(id: string): Promise<PollState | null>;
  recordVote(pollId: string, clientId: string, optionId: string): Promise<{ options: PollOption[]; total: number }>;
}

export function createPollRepo(db: Db): PollRepo {
  const polls: Collection<PollDoc> = db.collection("polls");
  const votes: Collection<VoteDoc> = db.collection("votes");

  function toPollState(doc: PollDoc & { _id: ObjectId }): PollState {
    return {
      id: doc._id.toHexString(),
      roomCode: doc.roomCode,
      question: doc.question,
      options: doc.options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: o.votes,
      })),
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  return {
    async createPoll(params: CreatePollParams): Promise<PollState> {
      const optionsDocs: PollOptionDoc[] = params.options.map((label, idx) => ({
        id: `opt_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
        label,
        votes: 0,
      }));

      // Close previous open polls in this room before starting a new one
      await polls.updateMany(
        { roomCode: params.roomCode, status: "open" },
        { $set: { status: "closed" } }
      );

      const doc: PollDoc = {
        roomCode: params.roomCode,
        question: params.question,
        options: optionsDocs,
        status: "open",
        createdAt: new Date(),
      };

      const result = await polls.insertOne(doc);
      return toPollState({ ...doc, _id: result.insertedId });
    },

    async findActiveByRoomCode(roomCode: string): Promise<PollState | null> {
      const doc = await polls.findOne(
        { roomCode, status: "open" },
        { sort: { createdAt: -1 } }
      );
      if (!doc) return null;
      return toPollState(doc as PollDoc & { _id: ObjectId });
    },

    async findById(id: string): Promise<PollState | null> {
      if (!ObjectId.isValid(id)) return null;
      const doc = await polls.findOne({ _id: new ObjectId(id) });
      if (!doc) return null;
      return toPollState(doc as PollDoc & { _id: ObjectId });
    },

    async closePoll(id: string): Promise<PollState | null> {
      if (!ObjectId.isValid(id)) return null;
      const result = await polls.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status: "closed" } },
        { returnDocument: "after" }
      );
      if (!result) return null;
      return toPollState(result as PollDoc & { _id: ObjectId });
    },

    async recordVote(
      pollId: string,
      clientId: string,
      optionId: string
    ): Promise<{ options: PollOption[]; total: number }> {
      if (!ObjectId.isValid(pollId)) {
        throw new Error("INVALID_POLL_ID");
      }

      const pollObjId = new ObjectId(pollId);
      const poll = await polls.findOne({ _id: pollObjId });
      if (!poll) {
        throw new Error("POLL_NOT_FOUND");
      }
      if (poll.status === "closed") {
        throw new Error("POLL_CLOSED");
      }
      if (!poll.options.some((o) => o.id === optionId)) {
        throw new Error("INVALID_OPTION");
      }

      // 1. Insert vote document (unique constraint enforces 1 vote per client)
      try {
        await votes.insertOne({
          pollId,
          clientId,
          optionId,
          createdAt: new Date(),
        });
      } catch (err: unknown) {
        if (err instanceof MongoServerError && err.code === 11000) {
          throw new Error("ALREADY_VOTED");
        }
        throw err;
      }

      // 2. Increment vote counter atomically on the poll option
      const updated = await polls.findOneAndUpdate(
        { _id: pollObjId, "options.id": optionId },
        { $inc: { "options.$.votes": 1 } },
        { returnDocument: "after" }
      );

      if (!updated) {
        throw new Error("FAILED_TO_UPDATE_VOTE_COUNT");
      }

      const updatedOptions = updated.options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: o.votes,
      }));
      const total = updatedOptions.reduce((sum, o) => sum + o.votes, 0);

      return { options: updatedOptions, total };
    },
  };
}
