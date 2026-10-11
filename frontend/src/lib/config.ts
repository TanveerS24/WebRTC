export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws",
  turnUrl: process.env.NEXT_PUBLIC_TURN_URL || "",
  turnUsername: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
  turnCredential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
} as const;
