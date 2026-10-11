// keep in sync: src/protocol/messages.ts (backend) <-> src/lib/protocol.ts (frontend)
import { z } from "zod";

// --- Domain Models ---
export const PollOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  votes: z.number().int().nonnegative(),
});
export type PollOption = z.infer<typeof PollOptionSchema>;

export const PollStateSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  question: z.string(),
  options: z.array(PollOptionSchema),
  status: z.enum(["open", "closed"]),
  createdAt: z.string(),
});
export type PollState = z.infer<typeof PollStateSchema>;

export const UpdateItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// --- Client -> Server Payloads ---
export const JoinRoomPayloadSchema = z.object({
  code: z.string().regex(/^\d{4}$/, "Room code must be 4 digits"),
  role: z.enum(["host", "audience"]),
  clientId: z.string().min(1, "clientId is required"),
  hostToken: z.string().optional(),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const PostUpdatePayloadSchema = z.object({
  text: z.string().trim().min(1, "Text cannot be empty").max(500, "Text max 500 characters"),
});
export type PostUpdatePayload = z.infer<typeof PostUpdatePayloadSchema>;

export const PollCreatePayloadSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty").max(200, "Question max 200 characters"),
  options: z.array(z.string().trim().min(1).max(100)).min(2, "At least 2 options").max(6, "At most 6 options"),
});
export type PollCreatePayload = z.infer<typeof PollCreatePayloadSchema>;

export const PollVotePayloadSchema = z.object({
  pollId: z.string().min(1, "pollId is required"),
  optionId: z.string().min(1, "optionId is required"),
});
export type PollVotePayload = z.infer<typeof PollVotePayloadSchema>;

export const PollClosePayloadSchema = z.object({ pollId: z.string().min(1, "pollId is required") });
export type PollClosePayload = z.infer<typeof PollClosePayloadSchema>;

export const LatencyPingPayloadSchema = z.object({ sentAt: z.number() });
export type LatencyPingPayload = z.infer<typeof LatencyPingPayloadSchema>;

export const RtcJoinPayloadSchema = z.record(z.string(), z.unknown()).default({});
export type RtcJoinPayload = z.infer<typeof RtcJoinPayloadSchema>;

export const RtcOfferPayloadSchema = z.object({ to: z.string().min(1), sdp: z.unknown() });
export type RtcOfferPayload = z.infer<typeof RtcOfferPayloadSchema>;

export const RtcAnswerPayloadSchema = z.object({ to: z.string().min(1), sdp: z.unknown() });
export type RtcAnswerPayload = z.infer<typeof RtcAnswerPayloadSchema>;

export const RtcIcePayloadSchema = z.object({ to: z.string().min(1), candidate: z.unknown() });
export type RtcIcePayload = z.infer<typeof RtcIcePayloadSchema>;

export const RtcLeavePayloadSchema = z.record(z.string(), z.unknown()).default({});
export type RtcLeavePayload = z.infer<typeof RtcLeavePayloadSchema>;

export const ClientEnvelopeSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional().default({}),
});
export type ClientEnvelope = z.infer<typeof ClientEnvelopeSchema>;

// --- Server -> Client Payloads ---
export const JoinedPayloadSchema = z.object({
  code: z.string(),
  role: z.enum(["host", "audience"]),
  peerId: z.string(),
  history: z.array(UpdateItemSchema),
  activePoll: PollStateSchema.nullable(),
  memberCount: z.number().int().nonnegative(),
});
export type JoinedPayload = z.infer<typeof JoinedPayloadSchema>;

export const MemberCountPayloadSchema = z.object({ count: z.number().int().nonnegative() });
export type MemberCountPayload = z.infer<typeof MemberCountPayloadSchema>;

export const UpdatePayloadSchema = UpdateItemSchema;
export type UpdatePayload = z.infer<typeof UpdatePayloadSchema>;

export const PollStatePayloadSchema = z.object({ poll: PollStateSchema.nullable() });
export type PollStatePayload = z.infer<typeof PollStatePayloadSchema>;

export const PollResultsPayloadSchema = z.object({
  pollId: z.string(),
  options: z.array(PollOptionSchema),
  total: z.number().int().nonnegative(),
});
export type PollResultsPayload = z.infer<typeof PollResultsPayloadSchema>;

export const LatencyPongPayloadSchema = z.object({ sentAt: z.number(), serverAt: z.number() });
export type LatencyPongPayload = z.infer<typeof LatencyPongPayloadSchema>;

export const RtcPeersPayloadSchema = z.object({ peers: z.array(z.string()) });
export type RtcPeersPayload = z.infer<typeof RtcPeersPayloadSchema>;

export const RtcRelayOfferPayloadSchema = z.object({ from: z.string(), sdp: z.unknown() });
export type RtcRelayOfferPayload = z.infer<typeof RtcRelayOfferPayloadSchema>;

export const RtcRelayAnswerPayloadSchema = z.object({ from: z.string(), sdp: z.unknown() });
export type RtcRelayAnswerPayload = z.infer<typeof RtcRelayAnswerPayloadSchema>;

export const RtcRelayIcePayloadSchema = z.object({ from: z.string(), candidate: z.unknown() });
export type RtcRelayIcePayload = z.infer<typeof RtcRelayIcePayloadSchema>;

export const RtcPeerLeftPayloadSchema = z.object({ peerId: z.string() });
export type RtcPeerLeftPayload = z.infer<typeof RtcPeerLeftPayloadSchema>;

export const RtcFullPayloadSchema = z.record(z.string(), z.unknown()).default({});
export type RtcFullPayload = z.infer<typeof RtcFullPayloadSchema>;

export const ErrorPayloadSchema = z.object({ message: z.string(), code: z.string().optional() });
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export type ServerMessage =
  | { type: "joined"; payload: JoinedPayload }
  | { type: "member_count"; payload: MemberCountPayload }
  | { type: "update"; payload: UpdatePayload }
  | { type: "poll_state"; payload: PollStatePayload }
  | { type: "poll_results"; payload: PollResultsPayload }
  | { type: "latency_pong"; payload: LatencyPongPayload }
  | { type: "rtc_peers"; payload: RtcPeersPayload }
  | { type: "rtc_offer"; payload: RtcRelayOfferPayload }
  | { type: "rtc_answer"; payload: RtcRelayAnswerPayload }
  | { type: "rtc_ice"; payload: RtcRelayIcePayload }
  | { type: "rtc_peer_left"; payload: RtcPeerLeftPayload }
  | { type: "rtc_full"; payload: RtcFullPayload }
  | { type: "error"; payload: ErrorPayload };
