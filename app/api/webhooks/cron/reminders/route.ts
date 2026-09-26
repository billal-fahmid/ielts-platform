import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/services/live-classes";

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sends the class reminders that are due. Point a scheduler (cron, a hosting cron job, GitHub Actions) at this every
 * few minutes with the header `x-cron-secret: <CRON_SECRET>`. Without CRON_SECRET (16+ characters) it is switched off,
 * and reminders still go out as people use the site.
 */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json({ sent: sendDueReminders(new Date(), { force: true }) });
}
