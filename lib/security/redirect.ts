/**
 * A same-site path that is safe to send someone to after signing in. Anything else (another site, a protocol-relative
 * "//evil.com", a backslash trick, control characters) falls back to the default, so the login page can't be used as an
 * open redirect.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || value.length > 500) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
