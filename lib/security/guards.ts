import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type SessionUser = { id: string; role: Role; name: string | null; email: string | null };

export type Guard = { ok: true; user: SessionUser } | { ok: false; response: NextResponse };

async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as any;
  if (!u?.id) return null;
  return { id: u.id, role: (u.role ?? "STUDENT") as Role, name: u.name ?? null, email: u.email ?? null };
}

/** For API routes: a signed-in user, or a 401 response to return. */
export async function requireUser(): Promise<Guard> {
  const user = await currentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  return { ok: true, user };
}

/** For API routes: a signed-in user with one of the roles, or a 401/403 response to return. */
export async function requireRole(...roles: Role[]): Promise<Guard> {
  const guard = await requireUser();
  if (!guard.ok) return guard;
  if (!roles.includes(guard.user.role)) return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return guard;
}

/** For server-rendered pages: the signed-in user, or a redirect to sign in / to the dashboard. */
export async function requirePageRole(roles: Role[], redirectTo = "/dashboard"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(redirectTo);
  return user;
}

export const isStaff = (role: string | undefined | null) => role === "ADMIN" || role === "TEACHER";
