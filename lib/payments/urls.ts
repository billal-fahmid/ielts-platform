/** The public address of this site, for links that leave it (gateway callbacks, emails). */
export function appBaseUrl(req?: Request): string {
  const configured = process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
