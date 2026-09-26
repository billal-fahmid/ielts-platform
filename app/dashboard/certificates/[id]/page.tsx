import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCertificateForUser } from "@/lib/services/certificates";
import { formatWhen } from "@/lib/teaching/rules";
import { CopyButton, PrintButton } from "@/components/growth/controls";

export const metadata = { title: "Certificate — BanglaEnglish" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  // Only the owner opens their certificate here; anyone else uses the public verification page.
  const cert = getCertificateForUser(userId, id);
  if (!cert) notFound();
  const base = (process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const verifyUrl = `${base}/verify/${cert.code}`;
  const issued = new Date(/[TZ]/.test(cert.issuedAt) ? cert.issuedAt : cert.issuedAt.replace(" ", "T") + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {/* When printed, show only the certificate itself. */}
      <style>{`@media print { header, aside, nav, .no-print { display: none !important; } main { padding: 0 !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/certificates" className="text-sm text-ink-soft hover:text-ink">
          ← Certificates
        </Link>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={verifyUrl} label="Copy verification link" />
          <PrintButton />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-4 border-double border-primary/60 bg-surface p-8 text-center sm:p-12" data-testid="certificate">
        {cert.revokedAt && <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">This certificate has been revoked and is no longer valid.</p>}
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
          <Award className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">BanglaEnglish</p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Certificate of Completion</h1>
        <p className="mt-6 text-sm text-ink-soft">This certifies that</p>
        <p className="mt-2 font-display text-3xl text-primary" data-testid="cert-name">
          {cert.studentName}
        </p>
        <p className="mt-4 text-sm text-ink-soft">has successfully completed every lesson of the course</p>
        <p className="mt-2 font-display text-2xl text-ink" data-testid="cert-course">
          {cert.courseTitle}
        </p>
        <p className="mt-6 text-sm text-ink-soft">Issued on {issued}</p>
        <div className="mx-auto mt-8 max-w-md border-t border-border pt-4 text-xs text-ink-soft">
          <p>
            Certificate code <span className="font-mono font-semibold text-ink">{cert.code}</span>
          </p>
          <p className="mt-1 break-all">Verify it at {verifyUrl}</p>
        </div>
      </div>
      <p className="no-print text-xs text-ink-soft">Issued {formatWhen(cert.issuedAt)}. This certificate shows course completion on BanglaEnglish; it is not an IELTS result.</p>
    </div>
  );
}
