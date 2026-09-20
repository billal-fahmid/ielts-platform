import { escapeHtml } from "@/lib/security/http";

export type EmailContent = {
  title: string;
  /** Plain paragraphs; blank lines separate them. Escaped before use in HTML. */
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const BRAND = "BanglaEnglish";

/** Renders the same message as plain text and as simple, inline-styled HTML. All user-supplied text is escaped. */
export function renderEmail(content: EmailContent): { text: string; html: string } {
  const paragraphs = content.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const cta = content.ctaUrl && content.ctaLabel ? { label: content.ctaLabel, url: content.ctaUrl } : null;

  const text = [content.title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : []), "", `— ${BRAND}`].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f3f1;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e1dd">
<tr><td style="padding:20px 24px;border-bottom:3px solid #c8102e;font-size:18px;font-weight:bold">${escapeHtml(BRAND)}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 14px;font-size:20px">${escapeHtml(content.title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
${cta ? `<p style="margin:20px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#c8102e;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:bold">${escapeHtml(cta.label)}</a></p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#777;margin:14px 0 0">You can turn off email notifications in your profile settings.</p>
</td></tr></table></body></html>`;

  return { text, html };
}
