import { Router, Request, Response } from "express";

// Health check endpoint for uptime monitors and deployment probes
export function createHealthRouter(): Router {
  const router = Router();
  router.get("/", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  return router;
}
