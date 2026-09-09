import type { Express } from "express";

import { loadEnv } from "../config/env.js";

/**
 * What Express passes to `app.set("trust proxy", ...)`. Only ever `false` (no
 * proxy), a hop count, or a hop-independent value such as `loopback` or a
 * subnet. A literal `true` is deliberately avoided: express-rate-limit rejects
 * it, and trusting every hop is a spoofing risk.
 */
export type TrustProxySetting = boolean | number | string;

/**
 * Parses the `TRUST_PROXY` env var:
 * - empty / "false" / "no" → `false` (no reverse proxy)
 * - "true" / "yes" → `1` (trust the first hop)
 * - a positive integer → that many hops
 * - anything else is passed through to Express ("loopback", "linklocal",
 *   "uniquelocal", or a subnet like "10.0.0.0/8"; may be comma-joined).
 */
export function parseTrustProxyRaw(raw: string): TrustProxySetting {
  const value = raw.trim().toLowerCase();
  if (value === "" || value === "false" || value === "no" || value === "0") return false;
  if (value === "true" || value === "yes") return 1;
  if (/^\d+$/.test(value)) return Number(value);
  return raw.trim();
}

/**
 * Configures the Express app-level trust proxy so `req.ip` resolves through a
 * reverse proxy / load balancer only when the operator declares one via
 * `TRUST_PROXY`. Defaults to no proxy: address-based rate limiting then keys on
 * the direct socket IP, which is the safe default.
 */
export function configureTrustProxy(app: Express): void {
  app.set("trust proxy", parseTrustProxyRaw(loadEnv().TRUST_PROXY));
}
