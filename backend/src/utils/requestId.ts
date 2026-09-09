export const REQUEST_ID_HEADER = "X-Request-Id";

export const REQUEST_ID_MAX_LENGTH = 128;

// Only allow safe tracing characters: alphanumeric, hyphens, underscores, dots.
export const REQUEST_ID_SAFE_PATTERN = /^[a-zA-Z0-9\-_.]+$/;

/**
 * Returns the request ID when it is ≤128 characters long and contains only
 * safe tracing characters, otherwise `null`. This is the single source of
 * truth used by both the request-ID middleware and the edge request guard so
 * the validation rule never drifts between layers.
 */
export function sanitizeRequestId(raw: string): string | null {
  if (raw.length > REQUEST_ID_MAX_LENGTH) return null;
  if (!REQUEST_ID_SAFE_PATTERN.test(raw)) return null;
  return raw;
}
