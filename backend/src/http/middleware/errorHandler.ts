import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger";

// Central error handler returns clean JSON and avoids leaking internal stack traces
export function errorHandlerMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("HTTP error caught by central middleware:", err);

  const status = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(status).json({ error: message });
}
