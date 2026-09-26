import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, SearchX, ShieldAlert } from "lucide-react";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { verifyCertificate } from "@/lib/services/certificates";

// Verification results are private to whoever holds the code, so search engines shouldn't list them.
export const metadata = { title: "Verify a certificate — BanglaEnglish", robots: { index: false, follow: false } };

const fmt = (iso: string) => new Date(/[TZ]/.test(iso) ? iso : iso.replace(" ", "T") + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const h = await headers();
  const ip = clientIp(new Request("http://localhost", { headers: h }));
  const allowed = checkRateLimit("verify-certificate", ip, 120, 60).ok;
  const result = allowed ? verifyCertificate(decodeURIComponent(code)) : null;

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center" data-testid="verify-result">
        {!allowed ? (
          <>
            <ShieldAlert className="mx-auto h-10 w-10 text-accent-dark" />
            <h1 className="mt-4 font-display text-2xl text-ink">Too many checks</h1>
            <p className="mt-2 text-sm text-ink-soft">Please wait a minute and try again.</p>
          </>
        ) : !result ? (
          <>
            <SearchX className="mx-auto h-10 w-10 text-ink-soft" />
            <h1 className="mt-4 font-display text-2xl text-ink" data-testid="verify-status">
              Certificate not found
            </h1>
            <p className="mt-2 text-sm text-ink-soft">We couldn&apos;t find a certificate with that code. Check that it was typed exactly as printed (it looks like CERT-ABCDE-FGHJK).</p>
          </>
        ) : result.status === "VALID" ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h1 className="mt-4 font-display text-2xl text-ink" data-testid="verify-status">
              Valid certificate
            </h1>
            <p className="mt-2 text-sm text-ink-soft">BanglaEnglish issued this certificate.</p>
            <dl className="mt-6 flex flex-col gap-3 text-left text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-soft">Awarded to</dt>
                <dd className="font-display text-xl text-ink" data-testid="verify-name">
                  {result.studentName}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-soft">For completing</dt>
                <dd className="font-medium text-ink" data-testid="verify-course">
                  {result.courseTitle}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-soft">Issued</dt>
                <dd className="text-ink">{fmt(result.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-soft">Code</dt>
                <dd className="font-mono text-ink">{result.code}</dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-ink-soft">This certificate confirms completion of a course on BanglaEnglish. It is not an IELTS score.</p>
          </>
        ) : (
          <>
            <ShieldAlert className="mx-auto h-10 w-10 text-danger" />
            <h1 className="mt-4 font-display text-2xl text-ink" data-testid="verify-status">
              Certificate revoked
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              The certificate <span className="font-mono">{result.code}</span> was issued but has since been withdrawn by BanglaEnglish and is no longer valid.
            </p>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-primary underline">
          Back to BanglaEnglish
        </Link>
      </div>
    </div>
  );
}
