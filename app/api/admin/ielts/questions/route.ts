import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/auth";
import { createQuestion, listParents, listQuestionRows } from "@/lib/services/ielts-admin";

export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;
  return NextResponse.json({ items: listQuestionRows(), parents: listParents() });
}

export async function POST(req: Request) {
  const denied = await requireStaff();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const result = createQuestion(body);
  if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: 400 });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
