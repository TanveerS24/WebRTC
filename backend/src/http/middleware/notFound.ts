import type { Request, Response } from "express";

// Central 404 handler for unmatched routes
export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found" });
}
