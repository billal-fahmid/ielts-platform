/**
 * CSRF defence for cookie-authenticated API calls. Browsers attach an Origin (or Sec-Fetch-Site)
 * header to state-changing requests, so a request that comes from another site is rejected.
 * Requests with neither header (scripts, server-to-server) are allowed: they can't ride on a
 * victim's browser cookies.
 */
export function isSameOriginRequest(req: Request): boolean {
  const allowed = new Set<string>();
  for (const h of ["host", "x-forwarded-host"]) {
    const v = req.headers.get(h);
    if (v) allowed.add(v.split(",")[0].trim().toLowerCase());
  }
  for (const url of [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.APP_URL]) {
    if (!url) continue;
    try {
      allowed.add(new URL(url).host.toLowerCase());
    } catch {
      /* ignore a malformed setting */
    }
  }

  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    try {
      return allowed.has(new URL(origin).host.toLowerCase());
    } catch {
      return false;
    }
  }
  if (origin === "null") return false;

  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  return true;
}

export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
