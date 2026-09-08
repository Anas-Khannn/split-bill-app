import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  TRUST_PROXY: z.string().default("false"),
  DISTRIBUTED_LOCK_TTL_MS: z.coerce.number().int().positive().default(10000),
  JOB_QUEUE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  JOB_QUEUE_BASE_BACKOFF_MS: z.coerce.number().int().positive().default(2000),
  JOB_QUEUE_MAX_BACKOFF_MS: z.coerce.number().int().positive().default(60000),
  JOB_QUEUE_LEASE_MS: z.coerce.number().int().positive().default(30000),
  JOB_QUEUE_PAYLOAD_TTL_MS: z.coerce.number().int().positive().default(86400000),
  JOB_QUEUE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  _env = parsed.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error("Environment not loaded. Call loadEnv() first.");
  }
  return _env;
}

export function resetEnv(): void {
  _env = null;
}
