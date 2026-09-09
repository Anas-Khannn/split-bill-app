import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const HEADER = "X-Request-Id";
const MAX_LENGTH = 128;

// Only allow safe tracing characters: alphanumeric, hyphens, underscores, dots.
const SAFE_PATTERN = /^[a-zA-Z0-9\-_.]+$/;

function sanitizeIncomingId(raw: string): string | null {
  if (raw.length > MAX_LENGTH) return null;
  if (!SAFE_PATTERN.test(raw)) return null;
  return raw;
}

/**
 * Assigns a request ID to every HTTP request and sets the `X-Request-Id`
 * response header so callers can correlate requests. The ID is always
 * available on `req.requestId` for downstream middleware, controllers,
 * and the logger.
 *
 * Client-provided `X-Request-Id` values are accepted when they are
 * ≤128 characters and contain only safe tracing characters. Malformed
 * or missing values fall back to a freshly generated UUID v4.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[HEADER.toLowerCase()];
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;

  const id = (raw && sanitizeIncomingId(raw)) || randomUUID();

  req.requestId = id;
  res.setHeader(HEADER, id);

  next();
}
