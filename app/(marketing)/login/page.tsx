import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in — BanglaEnglish" };

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Log in to continue your learning streak.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-ink-soft">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary">
            Create one free
          </Link>
        </p>
        <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-ink-soft">
          Demo accounts — Student: student@banglaenglish.app / student123 · Admin:
          admin@banglaenglish.app / admin123
        </div>
      </div>
    </div>
  );
}
