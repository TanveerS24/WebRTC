export interface PollOptionDoc {
  id: string;
  label: string;
  votes: number;
}

export interface PollDoc {
  roomCode: string;
  question: string;
  options: PollOptionDoc[];
  status: "open" | "closed";
  createdAt: Date;
}
