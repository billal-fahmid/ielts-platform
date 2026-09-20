import { db } from "@/lib/db";
import { errorLogs } from "@/lib/db/schema";
import { desc, lt } from "drizzle-orm";
import { id as newId } from "@/lib/utils";

const KEEP_LATEST = 5000;

const SECRET_PATTERNS: [RegExp, string][] = [
  [/sk-ant-[A-Za-z0-9_-]{10,}/g, "[key hidden]"],
  [/AIza[0-9A-Za-z_-]{20,}/g, "[key hidden]"],
  [/(bearer\s+)[A-Za-z0-9._-]{10,}/gi, "$1[hidden]"],
  [/((?:api[_-]?key|secret|token|password)["'=:\s]+)[^\s"',]{6,}/gi, "$1[hidden]"],
];

/** Errors are stored for admins to read, so anything that looks like a credential is masked first. */
export function redactSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

export type ErrorContext = { path?: string; method?: string; userId?: string | null; digest?: string };

/** Saves an error for the admin error log and prints it. Never throws. */
export function logError(source: string, err: unknown, ctx: ErrorContext = {}) {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${source}]`, redactSecrets(message));
  try {
    db.insert(errorLogs)
      .values({
        id: newId(),
        source,
        message: redactSecrets(message).slice(0, 1000),
        stack: stack ? redactSecrets(stack).slice(0, 4000) : null,
        path: ctx.path?.slice(0, 300) ?? null,
        method: ctx.method ?? null,
        userId: ctx.userId ?? null,
        digest: ctx.digest ?? null,
      })
      .run();
    if (Math.random() < 0.01) pruneErrorLogs();
  } catch {
    /* the log itself must never take the app down */
  }
}

/** Keeps the table from growing without limit. */
export function pruneErrorLogs() {
  const cutoff = db.select({ createdAt: errorLogs.createdAt }).from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(1).offset(KEEP_LATEST).get();
  if (cutoff) db.delete(errorLogs).where(lt(errorLogs.createdAt, cutoff.createdAt)).run();
}
