import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAIConnection } from "@/lib/ai/health";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const health = await checkAIConnection();
  return NextResponse.json(health);
}
