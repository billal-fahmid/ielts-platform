import Link from "next/link";
import { requirePageRole } from "@/lib/security/guards";
import { listAllCertificates } from "@/lib/services/certificates";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevokeButton } from "@/components/growth/certificate-actions";

export const metadata = { title: "Certificates — Admin" };

export default async function AdminCertificatesPage() {
  const user = await requirePageRole(["ADMIN"], "/admin");
  const certs = listAllCertificates(user.role);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Certificates</h1>
        <p className="mt-1 text-sm text-ink-soft">Issued automatically when a student finishes a course. Revoking one makes its public verification page say it is no longer valid. Showing the latest 200.</p>
      </div>
      {certs.length === 0 ? (
        <Card className="p-5 text-sm text-ink-soft">No certificates have been issued yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm" data-testid="cert-table">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/verify/${c.code}`} className="text-primary underline" target="_blank">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{c.studentName}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.courseTitle}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatWhen(c.issuedAt)}</td>
                  <td className="px-4 py-3">{c.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Valid</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <RevokeButton id={c.id} revoked={!!c.revokedAt} code={c.code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
