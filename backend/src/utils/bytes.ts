// Calculates exact payload size in bytes for WebSocket frames
export function getPayloadSizeBytes(payload: unknown): number {
  if (typeof payload === "string") {
    return Buffer.byteLength(payload, "utf8");
  }
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    return 0;
  }
}
