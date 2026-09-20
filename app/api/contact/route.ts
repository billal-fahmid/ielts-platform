import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { contactSchema } from "@/lib/validations";
import { readJson, cleanText } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Sends the message to the support inbox (SUPPORT_EMAIL, or the first admin's address). */
export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "contact", limit: 5, windowSeconds: 3600 });
  if (limited) return limited;

  const body = await readJson(req, contactSchema, 10_000);
  if (!body.ok) return body.response;

  const support = process.env.SUPPORT_EMAIL || db.select({ email: users.email }).from(users).where(eq(users.role, "ADMIN")).get()?.email;
  if (!support) return NextResponse.json({ error: "We can't accept messages right now. Please try again later." }, { status: 503 });

  const { name, email, message } = body.data;
  const result = await sendEmail({
    to: support,
    subject: `Contact form: ${cleanText(name).slice(0, 80)}`,
    title: "New message from the contact form",
    body: `From: ${cleanText(name)} <${email}>\n\n${cleanText(message)}`,
  });
  if (result.status === "FAILED") return NextResponse.json({ error: "We couldn't send your message. Please try again shortly." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
