import type { Instrumentation } from "next";

/** Server errors from any route or page are saved to the admin error log. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/security/error-log");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  logError("server", err, { path: request.path.split("?")[0], method: request.method, digest });
};
