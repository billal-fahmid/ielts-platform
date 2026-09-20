import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { URL_MODES, createSession, pickContent } from "@/lib/services/speaking";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  const mode = URL_MODES[String(body?.mode ?? "")];
  if (!mode) return NextResponse.json({ error: "Unknown session type" }, { status: 400 });

  const content = pickContent(mode);
  if (content.part1.length + content.part3.length === 0 && !content.cueCard) {
    return NextResponse.json({ error: "No speaking questions are available yet." }, { status: 404 });
  }

  const topic = content.cueCard?.topic ?? null;
  const created = createSession(userId, mode, topic);
  return NextResponse.json({ sessionId: created.id, content });
}
