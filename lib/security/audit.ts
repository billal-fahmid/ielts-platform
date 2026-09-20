import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { id as newId } from "@/lib/utils";
import { clientIp } from "@/lib/security/rate-limit";

export type AuditEntry = {
  actorId?: string | null;
  actorRole?: string | null;
  /** What happened, e.g. "resource.update". */
  action: string;
  entityType?: string;
  entityId?: string;
  /** Small, non-sensitive details. Never put passwords, tokens or payment secrets here. */
  metadata?: Record<string, unknown>;
};

const SENSITIVE = /pass(word)?|secret|token|key|authorization|cvv|card/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([k, v]) => [k, SENSITIVE.test(k) ? "[hidden]" : scrub(v, depth + 1)])
    );
  }
  if (typeof value === "string" && value.length > 300) return value.slice(0, 300) + "…";
  return value;
}

/** Records who did what. Never throws: a logging problem must not break the action itself. */
export function audit(entry: AuditEntry, req?: Request) {
  try {
    db.insert(auditLogs)
      .values({
        id: newId(),
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        metadata: scrub(entry.metadata ?? {}) as Record<string, unknown>,
        ip: req ? clientIp(req) : null,
      })
      .run();
  } catch (err) {
    console.error("[audit] could not write audit log:", err instanceof Error ? err.message : err);
  }
}
