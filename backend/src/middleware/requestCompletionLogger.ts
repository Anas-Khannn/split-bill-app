import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * Logs a structured entry after every HTTP response is sent.
 * Relies on `req.requestId` being set by the `requestId` middleware.
 * Does NOT log request/response bodies or sensitive headers.
 */
export function requestCompletionLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs / 1_000_000n);

    logger.info("request completed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
