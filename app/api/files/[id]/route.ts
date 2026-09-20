import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteFile, getFile } from "@/lib/services/files";
import { getStorage } from "@/lib/storage";
import { requireRole } from "@/lib/security/guards";
import { audit } from "@/lib/security/audit";
import { isSameOriginRequest } from "@/lib/security/origin";

type Ctx = { params: Promise<{ id: string }> };

/** Parses a single "bytes=start-end" range. Returns null if absent, "invalid" if it can't be satisfied. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalid";
  let start: number;
  let end: number;
  if (m[1] === "") {
    const suffix = Number(m[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end };
}

/** Streams an uploaded file (with range support so audio and video can seek), after checking who may see it. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const file = getFile(id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (file.visibility !== "PUBLIC") {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const staff = user.role === "ADMIN" || user.role === "TEACHER";
    if (file.visibility === "PRIVATE" && !(staff || user.id === file.ownerId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storage = getStorage();
  const range = parseRange(req.headers.get("range"), file.size);
  if (range === "invalid") return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });

  const opened = await storage.open(file.storageKey, range ?? undefined);
  if (!opened) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // Even a document that somehow contained script can't run in this site's context.
    "Content-Security-Policy": "sandbox; default-src 'none'; media-src 'self'; img-src 'self'",
    "Cache-Control": file.visibility === "PUBLIC" ? "public, max-age=86400" : "private, max-age=3600",
    "Content-Disposition": `${file.kind === "DOCUMENT" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
  };
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${file.size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
    return new NextResponse(opened.stream, { status: 206, headers });
  }
  headers["Content-Length"] = String(file.size);
  return new NextResponse(opened.stream, { status: 200, headers });
}

/** The uploader, or an admin, may delete a file. */
export async function DELETE(req: Request, { params }: Ctx) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const { id } = await params;
  const file = getFile(id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (g.user.role !== "ADMIN" && file.ownerId !== g.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await deleteFile(id);
  audit({ actorId: g.user.id, actorRole: g.user.role, action: "file.delete", entityType: "uploaded_files", entityId: id }, req);
  return NextResponse.json({ ok: true });
}
