import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { setEmailPreference } from "@/lib/services/notifications";

const schema = z.object({ emailNotifications: z.boolean() });

export async function PATCH(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const body = await readJson(req, schema);
  if (!body.ok) return body.response;
  setEmailPreference(g.user.id, body.data.emailNotifications);
  return NextResponse.json({ emailNotifications: body.data.emailNotifications });
}
