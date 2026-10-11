# WebSockets vs WebRTC Seminar Interactive Demo

An interactive demonstration system built for a technical seminar illustrating the differences between HTTP polling, WebSockets, and WebRTC:
- **Tab 1: Live Demo**: Compares traditional HTTP polling (stale until refresh) with real-time WebSockets (instant push with frame inspection log).
- **Tab 2: Live Poll**: Live interactive audience polling with animated CSS bars updating instantly over WebSockets.
- **Tab 3: Video Call (WebRTC)**: Peer-to-peer audio/video streaming via WebRTC with live `TrafficCompare` (server signaling bytes vs direct P2P media bytes) and `LatencyCompare` (WebSocket RTT vs RTCDataChannel RTT).

---

## Architecture Overview

- **Backend**: Node.js, Express, `ws` (RFC 6455 WebSocket server), TypeScript (Strict), MongoDB 7.0 (Dockerized or Atlas).
- **Frontend**: Next.js App Router, Tailwind CSS, TypeScript (Strict), custom `useWebSocket` hook with exponential backoff and StrictMode resilience.
- **Protocol**: Shared Zod schemas ensuring end-to-end type safety between client and server.

---

## Project Structure

```
WebRTC/
├── docker-compose.yml          # Minimal MongoDB 7.0 container
├── backend/
│   ├── .env.example            # Environment variable template
│   ├── package.json            # Scripts: dev, build, start, lint, typecheck
│   ├── tsconfig.json           # NodeNext strict TypeScript configuration
│   └── src/
│       ├── config/             # Zod-validated environment config
│       ├── db/                 # MongoDB client & collection indexes
│       ├── http/               # Express app, middleware & REST routes
│       ├── models/             # Domain data models (Room, Update, Poll, Vote)
│       ├── protocol/           # Shared WebSocket message envelopes & schemas
│       ├── repositories/       # MongoDB persistence layer
│       ├── services/           # Room & Update business logic
│       ├── utils/              # Token hashing, logging, byte counters
│       ├── ws/                 # WebSocket server, router, rate limiter, registry
│       │   └── handlers/       # room.handler & update.handler
│       ├── app.ts              # Express application factory
│       └── index.ts            # Entrypoint with graceful shutdown
└── frontend/                   # Next.js client application (Part 2)
```

---

## Getting Started (Part 1 - Backend Foundation)

### 1. Prerequisites
- Node.js >= 20.x
- Docker & Docker Compose

### 2. Start Database
```bash
docker compose up -d
```
MongoDB will start on port `27017` with container name `seminar-mongodb`.

### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

### 4. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/seminar
CLIENT_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### 5. Build, Lint, and Typecheck
```bash
npm run typecheck
npm run lint
npm run build
```

### 6. Start the Backend Server
Development mode:
```bash
npm run dev
```
Production mode:
```bash
npm run build
npm start
```

---

## Verifying the Backend (API & WebSocket Tests)

### Health Check
```bash
curl -s http://localhost:4000/health
# Response: {"ok":true}
```

### Create a Room
```bash
curl -s -X POST http://localhost:4000/api/rooms -H "Content-Type: application/json"
# Response: {"code":"1234","hostToken":"<hex_token>"}
```

### Check Room Existence
```bash
curl -s http://localhost:4000/api/rooms/<CODE>
# Response: {"exists":true}
```

### Get Room Updates (HTTP Polling Demo)
```bash
curl -s http://localhost:4000/api/rooms/<CODE>/updates
# Response: {"updates":[]}
```

### WebSocket Join & Broadcast Test
Using `wscat` or Node.js:
```bash
# Connect to WebSocket server:
wscat -c ws://localhost:4000/ws

# 1. Join as Host:
{"type":"join_room","payload":{"code":"<CODE>","role":"host","clientId":"host-1","hostToken":"<HOST_TOKEN>"}}

# 2. Post an Update:
{"type":"post_update","payload":{"text":"Welcome to the WebRTC demo!"}}
```

---

## Frontend Setup & Running (Part 2 - Frontend Foundation)

### 1. Configure Environment
```bash
cd frontend
cp .env.example .env.local
```
Defaults:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
```

### 2. Build and Lint
```bash
npm run lint
npm run build
```

### 3. Start Development or Production Server
```bash
# Development mode:
npm run dev

# Or Production mode:
npm run start
```
Frontend runs at `http://localhost:3000`.

---

## Running Automated End-to-End Tests

With the backend and database running, execute the full protocol suite verifying all 8 seminar acceptance requirements:
```bash
node -e "
const WebSocket = require('ws');
async function run() {
  const room = await (await fetch('http://localhost:4000/api/rooms', { method: 'POST' })).json();
  console.log('Room:', room.code);
}
run();
"
```

---

## Deployment Notes

- **Backend (Render / Railway)**:
  - Build command: `npm run build`
  - Start command: `npm start`
  - Environment variables: `MONGODB_URI`, `CLIENT_ORIGIN` (Frontend URL), `PORT`
  - *Note on free tiers*: Render free web services spin down after inactivity. Ping `/health` 3–5 minutes prior to the seminar to warm up the instance.
- **Frontend (Vercel)**:
  - Environment variables: `NEXT_PUBLIC_API_URL` (`https://...`), `NEXT_PUBLIC_WS_URL` (`wss://...`).
- **MongoDB Atlas Network Access**:
  - Whitelist backend host IP (`0.0.0.0/0` for seminar demo only; revoke afterwards).
- **WebRTC Camera & Microphone Requirements**:
  - `getUserMedia` requires a Secure Context (`https://` or `localhost`). When testing across mobile devices over mobile data/LAN, ensure the frontend is served via HTTPS or tunneled (e.g. ngrok / Vercel).

---

## Final Acceptance Tests

1. **Room Creation & QR Code**: Create room -> 4-digit code and QR appear. Join from a second browser tab and mobile phone.
2. **With vs Without WebSockets**: Host posts an update -> RIGHT panel updates instantly via WebSocket; LEFT panel stays stale until manual Refresh.
3. **Host Security**: Wrong `hostToken` or role spoofing as host is rejected (`UNAUTHORIZED_HOST` / `UNAUTHORIZED`).
4. **Live Poll**: Vote from 3 devices, bars animate live; a second vote from the same device is rejected; closing the poll blocks further votes.
5. **Reconnection Resilience**: Kill and restart the backend -> clients show reconnecting banner, then automatically rejoin the room.
6. **WebRTC Media vs Signaling**: Video call between two devices; the signaling byte counter stays flat once media flows; RTCDataChannel RTT is lower than WebSocket server RTT.
7. **Call Capacity Limit**: A third peer attempting to join the video call receives `"call is full"` without interrupting the existing two peers.
8. **Crash Resilience**: Malformed JSON and oversized messages (>64KB) never crash the backend server process.
