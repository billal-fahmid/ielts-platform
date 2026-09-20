import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_TRANSCRIPT_CHARS, MAX_TURNS_PER_SESSION, getSession, getTurns, saveTurn, type Part } from "@/lib/services/speaking";

const PARTS: Part[] = ["PART1", "PART2", "PART3"];

function num(v: unknown, max: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { sessionId } = await params;
  const speakingSession = getSession(sessionId);
  if (!speakingSession || speakingSession.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (speakingSession.status !== "IN_PROGRESS") return NextResponse.json({ error: "Session already finished" }, { status: 409 });
  if (getTurns(sessionId).length >= MAX_TURNS_PER_SESSION) return NextResponse.json({ error: "Too many answers" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const part = body?.part as Part;
  const questionText = typeof body?.questionText === "string" ? body.questionText.slice(0, 1500) : "";
  const transcript = typeof body?.transcript === "string" ? body.transcript : "";
  if (!PARTS.includes(part) || !questionText) return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  if (transcript.length > MAX_TRANSCRIPT_CHARS) return NextResponse.json({ error: "Answer is too long" }, { status: 400 });

  saveTurn(sessionId, {
    part,
    promptId: typeof body?.promptId === "string" ? body.promptId : null,
    questionText,
    transcript: transcript.trim(),
    durationSeconds: num(body?.durationSeconds, 900),
    pauseCount: num(body?.pauseCount, 500),
    totalPauseMs: num(body?.totalPauseMs, 900000),
    typed: body?.typed === true,
  });
  return NextResponse.json({ ok: true });
}
