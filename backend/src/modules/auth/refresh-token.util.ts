import { createHash, randomBytes } from "node:crypto";

// Opaque refresh tokens are high-entropy random strings. Only their SHA-256
// digest is persisted, so a database leak does not expose usable refresh
// credentials and refresh tokens can be re-issued (rotated) without risk.
const REFRESH_TOKEN_BYTES = 32;

/**
 * Generates a new opaque refresh token (256 bits of entropy, base64url encoded).
 * The plaintext value is returned exactly once, to the client at issuance time.
 */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

/**
 * Returns the SHA-256 hex digest of a refresh token. Used for database lookup
 * and persistence; the raw token is never stored or logged.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
