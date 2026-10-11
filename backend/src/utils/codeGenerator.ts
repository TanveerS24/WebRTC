import crypto from "crypto";

// Generates a 4-digit numeric room code between 1000 and 9999
export function generateRoomCode(): string {
  return crypto.randomInt(1000, 10000).toString();
}

// Generates a random 32-byte host token encoded in hex (64 chars)
export function generateHostToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generates SHA-256 hash of the host token to store in the database
export function hashHostToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
