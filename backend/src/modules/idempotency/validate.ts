import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { APP_ERRORS } from "../../constants/app-errors.js";
import { BadRequestError } from "../../errors/app.error.js";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "Idempotency-Key must be at least 8 characters.")
  .max(128, "Idempotency-Key is too long.")
  .regex(/^[A-Za-z0-9._-]+$/, "Idempotency-Key contains invalid characters.");

export function requireIdempotencyKey(req: Request, _res: Response, next: NextFunction): void {
  const rawKey = req.header(IDEMPOTENCY_KEY_HEADER);

  if (rawKey === undefined || rawKey.trim().length === 0) {
    next(
      new BadRequestError(
        APP_ERRORS.IDEMPOTENCY_KEY_MISSING,
        "Idempotency-Key header is required for this request.",
      ),
    );
    return;
  }

  const parsed = idempotencyKeySchema.safeParse(rawKey);
  if (!parsed.success) {
    next(
      new BadRequestError(
        APP_ERRORS.IDEMPOTENCY_KEY_INVALID,
        "Idempotency-Key header must be a valid key between 8 and 128 characters using only letters, digits, underscore, hyphen, or dot.",
      ),
    );
    return;
  }

  req.idempotencyKey = parsed.data;
  next();
}
