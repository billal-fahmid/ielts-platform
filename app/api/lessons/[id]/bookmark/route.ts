import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleBookmark } from "@/lib/services/courses";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const bookmarked = toggleBookmark((session.user as any).id, id);
  return NextResponse.json({ bookmarked });
}
