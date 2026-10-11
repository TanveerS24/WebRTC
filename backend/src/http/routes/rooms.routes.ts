import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { RoomService } from "../../services/roomService";
import type { UpdateService } from "../../services/updateService";

const CodeParamSchema = z.string().regex(/^\d{4}$/, "Room code must be a 4-digit number");

// Room routes providing REST endpoints for room creation, verification, and HTTP polling
export function createRoomsRouter(deps: {
  roomService: RoomService;
  updateService: UpdateService;
}): Router {
  const router = Router();
  const { roomService, updateService } = deps;

  // POST /api/rooms - Create a new room with 4-digit code and hostToken
  router.post("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const room = await roomService.createRoom();
      res.status(201).json(room);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "ROOM_ALLOCATION_FAILED") {
        res.status(503).json({ error: "Unable to allocate room code after multiple retries" });
        return;
      }
      next(err);
    }
  });

  // GET /api/rooms/:code - Check if room exists
  router.get("/:code", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CodeParamSchema.safeParse(req.params.code);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid room code" });
        return;
      }
      const exists = await roomService.roomExists(parsed.data);
      res.json({ exists });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/rooms/:code/updates - Polling endpoint for updates (Without WebSocket panel)
  router.get("/:code/updates", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CodeParamSchema.safeParse(req.params.code);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid room code" });
        return;
      }
      const exists = await roomService.roomExists(parsed.data);
      if (!exists) {
        res.status(404).json({ error: "Room not found" });
        return;
      }
      const updates = await updateService.getUpdates(parsed.data);
      res.json({ updates });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
