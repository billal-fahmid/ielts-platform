import Link from "next/link";
import { Award } from "lucide-react";
import { auth } from "@/lib/auth";
import { issueMissingCertificates, listCertificates } from "@/lib/services/certificates";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Certificates — BanglaEnglish" };

export default async function CertificatesPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  // Courses finished before certificates existed get theirs the first time this page opens.
  issueMissingCertificates(userId);
  const certs = listCertificates(userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Certificates</h1>
        <p className="mt-1 text-sm text-ink-soft">You earn a certificate for every course you finish. Anyone can check it is genuine with its code.</p>
      </div>

      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Finish every lesson in a course and your certificate appears here." action={<LinkButton href="/dashboard/courses">Browse courses</LinkButton>} />
      ) : (
        <div className="flex flex-col gap-3" data-testid="certificates">
          {certs.map((c) => (
            <Link key={c.id} href={`/dashboard/certificates/${c.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                    <Award className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-ink">{c.courseTitle}</p>
                    <p className="text-xs text-ink-soft">
                      Issued {formatWhen(c.issuedAt)} · <span className="font-mono">{c.code}</span>
                    </p>
                  </div>
                </div>
                {c.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Valid</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
