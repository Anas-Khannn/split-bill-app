import type { RequestHandler } from "express";
import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { loadEnv } from "../config/env.js";
import { HTTP_STATUSES } from "../constants/http-statuses.js";

const RATE_LIMIT_MESSAGE = { success: false, message: "Too many requests" } as const;

/**
 * Builds an `express-rate-limit` handler with the project's standard 429
 * response envelope. State is stored in the library's in-memory `MemoryStore`,
 * which is process-local: it must NOT be presented as distributed protection.
 *
 * Requests are attributed to the direct socket IP (`req.ip`). No `trust proxy`
 * is configured, so `X-Forwarded-For` is intentionally not trusted. When the
 * app is deployed behind a reverse proxy / load balancer, `trust proxy` must be
 * configured at the Express app level so clients are identified correctly.
 *
 * Rate limiting only runs authentication via the existing middleware graph; it
 * never queries the database and never uses request IDs as client identity.
 */
function createLimiter(limit: number, windowMs: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: HTTP_STATUSES.TOO_MANY_REQUESTS,
    message: RATE_LIMIT_MESSAGE,
  });
}

/**
 * General API limiter. Applied to every request at the app level.
 * A dedicated MemoryStore instance is created per call so each app
 * created by `createApp()` starts with empty rate-limit state.
 */
export function apiLimiter(): RequestHandler {
  const env = loadEnv();
  return createLimiter(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS);
}

/**
 * Authentication limiter. Applied to the `/api/v1/auth` router to cap
 * credential/refresh-token traffic (register, login, refresh, logout)
 * more tightly than general API traffic.
 */
export function authLimiter(): RequestHandler {
  const env = loadEnv();
  return createLimiter(env.AUTH_RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS);
}