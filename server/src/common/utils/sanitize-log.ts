const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "refreshtoken",
  "refresh_token",
  "accesstoken",
  "access_token",
  "idtoken",
  "id_token",
  "authorization",
  "token",
]);

export function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = sanitizeForLog(val);
  }
  return out;
}
