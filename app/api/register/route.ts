import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { createUser } from "@/lib/services/users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const userId = await createUser(parsed.data.name, parsed.data.email, parsed.data.password);
    return NextResponse.json({ userId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not create account" }, { status: 400 });
  }
}
