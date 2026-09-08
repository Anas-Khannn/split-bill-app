import express from "express";
import cors from "cors";
import helmet from "helmet";

import { loadEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { requestId } from "./middleware/requestId.js";
import { requestCompletionLogger } from "./middleware/requestCompletionLogger.js";
import healthRoutes from "./routes/health.js";
import apiV1Routes from "./routes/index.js";

export function createApp(): express.Express {
  const env = loadEnv();

  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
        "X-Request-Id",
      ],
    }),
  );

  app.use(apiLimiter());

  app.use(requestId);
  app.use(requestCompletionLogger);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use("/health", healthRoutes);

  app.use("/api/v1/auth", authLimiter());
  app.use("/api/v1", apiV1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
