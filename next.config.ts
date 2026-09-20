import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is needed for Speaking practice; camera and location are never used.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(self)" },
  // A conservative policy that blocks framing, plugin content and form posts to other sites without
  // restricting scripts (a nonce-based script policy is a later hardening step).
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "nodemailer"],
  allowedDevOrigins: ["10.0.30.133"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
