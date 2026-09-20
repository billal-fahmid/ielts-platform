import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security/guards";
import { isSameOriginRequest } from "@/lib/security/origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/error-log";
import { saveUpload, type Visibility } from "@/lib/services/files";
import { MAX_BYTES, type FileKind } from "@/lib/storage/validate";

export const maxDuration = 120;

const KINDS = new Set<FileKind>(["VIDEO", "AUDIO", "IMAGE", "DOCUMENT"]);
const VISIBILITIES = new Set<Visibility>(["PUBLIC", "MEMBERS", "PRIVATE"]);

/**
 * Teachers and admins upload course media here. This route is excluded from the global proxy (large
 * bodies), so it repeats the same-origin check itself.
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "upload", limit: 60, windowSeconds: 3600, key: g.user.id });
  if (limited) return limited;

  // Refuse obviously oversized requests before reading them into memory.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES.VIDEO + 1024 * 1024) return NextResponse.json({ error: "That file is too large." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });

  const kindsRaw = String(form.get("kinds") ?? "")
    .split(",")
    .map((k) => k.trim().toUpperCase())
    .filter((k): k is FileKind => KINDS.has(k as FileKind));
  const allowedKinds: FileKind[] = kindsRaw.length ? kindsRaw : ["VIDEO", "AUDIO", "IMAGE", "DOCUMENT"];
  const requestedVisibility = String(form.get("visibility") ?? "MEMBERS").toUpperCase() as Visibility;
  const visibility: Visibility = VISIBILITIES.has(requestedVisibility) ? requestedVisibility : "MEMBERS";

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await saveUpload({ ownerId: g.user.id, data, originalName: file.name, allowedKinds, visibility });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    audit(
      { actorId: g.user.id, actorRole: g.user.role, action: "file.upload", entityType: "uploaded_files", entityId: result.file.id, metadata: { kind: result.file.kind, size: result.file.size, visibility } },
      req
    );
    return NextResponse.json(
      { id: result.file.id, url: result.url, kind: result.file.kind, contentType: result.file.contentType, size: result.file.size, name: result.file.originalName },
      { status: 201 }
    );
  } catch (err) {
    logError("api:/api/uploads", err, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: "We could not save that file. Please try again." }, { status: 500 });
  }
}
