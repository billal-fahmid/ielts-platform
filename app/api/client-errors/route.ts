import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";

const schema = z.object({ message: z.string().max(500), digest: z.string().max(100).optional(), path: z.string().max(300).optional() });

/** Browser error boundaries report crashes here so admins can see them. Rate-limited and size-limited. */
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "client-errors", limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const body = await readJson(req, schema, 5_000);
  if (!body.ok) return body.response;

  const session = await auth();
  logError("client", body.data.message, { path: body.data.path, digest: body.data.digest, userId: (session?.user as any)?.id ?? null });
  return NextResponse.json({ ok: true });
}
