import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dismissRecommendation } from "@/lib/services/recommendations";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  if (!dismissRecommendation(userId, id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
