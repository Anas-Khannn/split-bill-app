import type { Express } from "express";

import { configureTrustProxy } from "./trustProxy.js";
import { edgeRequestGuard } from "./requestGuard.js";

/**
 * Installs the in-process application edge layer. The project deploys a plain
 * Node/Express process (no reverse proxy, no container orchestration), so the
 * gateway responsibilities live in-process and must run before everything else:
 *
 * 1. Trusted-proxy configuration (how `req.ip` should be resolved).
 * 2. Coarse request screening (URL hygiene, body-size pre-check, request-ID
 *    normalization) via {@link edgeRequestGuard}.
 *
 * Rate limiting and every business rule run *after* this layer in the normal
 * middleware graph.
 */
export function configureEdge(app: Express): void {
  configureTrustProxy(app);
  app.use(edgeRequestGuard());
}
