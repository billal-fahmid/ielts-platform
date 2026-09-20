import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Admin and teacher accounts may manage content. Returns an error response to send back, or null when allowed. */
export async function requireStaff(): Promise<NextResponse | null> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (role !== "ADMIN" && role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
