import nodemailer from "nodemailer";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import { id as newId } from "@/lib/utils";
import { logError } from "@/lib/security/error-log";
import { renderEmail, type EmailContent } from "./templates";

/** Anything that can deliver an email. Swap the implementation without touching callers. */
export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

class SmtpProvider implements EmailProvider {
  readonly name = "smtp";
  isConfigured() {
    return !!process.env.SMTP_HOST;
  }
  async send(message: { to: string; subject: string; text: string; html: string }) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({ from: process.env.EMAIL_FROM ?? "BanglaEnglish <no-reply@localhost>", ...message });
  }
}

let override: EmailProvider | null = null;
/** For tests: replace the provider. Pass null to restore the default. */
export function setEmailProviderForTests(provider: EmailProvider | null) {
  override = provider;
}

export function getEmailProvider(): EmailProvider | null {
  if (override) return override;
  const smtp = new SmtpProvider();
  return smtp.isConfigured() ? smtp : null;
}

const addressSchema = z.string().email().max(254);
const subjectSchema = z.string().min(1).max(200).refine((s) => !/[\r\n]/.test(s), "Subject can't contain line breaks");

export type SendEmailResult = { status: "SENT" | "FAILED" | "OUTBOX"; id: string };

/**
 * Sends an email and records it. Never throws: with no provider configured (development) the message
 * is stored in the outbox so admins can read it, and a delivery failure is recorded, not raised.
 */
export async function sendEmail(input: { to: string; subject: string; userId?: string | null } & EmailContent): Promise<SendEmailResult> {
  const id = newId();
  const { text, html } = renderEmail(input);
  const to = addressSchema.safeParse(input.to);
  const subject = subjectSchema.safeParse(input.subject);

  const record = (status: "SENT" | "FAILED" | "OUTBOX", provider: string, error?: string) => {
    try {
      db.insert(emailMessages)
        .values({ id, userId: input.userId ?? null, toEmail: input.to.slice(0, 254), subject: input.subject.slice(0, 200), bodyText: text, bodyHtml: html, status, provider, error: error?.slice(0, 500) ?? null })
        .run();
    } catch (err) {
      logError("email", err);
    }
    return { status, id };
  };

  if (!to.success || !subject.success) return record("FAILED", "none", "Invalid address or subject");

  const provider = getEmailProvider();
  if (!provider) return record("OUTBOX", "outbox");

  try {
    await provider.send({ to: to.data, subject: subject.data, text, html });
    return record("SENT", provider.name);
  } catch (err) {
    logError("email", err);
    return record("FAILED", provider.name, err instanceof Error ? err.message : "Send failed");
  }
}
