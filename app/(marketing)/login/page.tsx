import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { googleEnabled } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  UNVERIFIED_EMAIL: "Google says this email address isn't verified, so we can't use it. Verify it with Google, or sign up with email.",
  STAFF_ACCOUNT: "This email belongs to a teacher or administrator account. Please log in with your email and password.",
  NO_EMAIL: "Google didn't share an email address, so we couldn't sign you in.",
  GOOGLE_FAILED: "Google sign-in didn't work. Please try again, or use your email and password.",
  Configuration: "Sign-in isn't available right now. Please try again in a moment.",
};

export const metadata: Metadata = { title: "Log in — BanglaEnglish", robots: { index: false } };

// The demo passwords are public knowledge, so they are only shown while developing (or on a deliberate public demo site).
const showDemoLogins = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_LOGINS === "true";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const message = error ? ERRORS[error] ?? "Sign-in didn't work. Please try again." : null;
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
        {message && (
          <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {message}
          </p>
        )}
        {googleEnabled() && <GoogleButton callbackUrl={callbackUrl} />}
        <LoginForm />
        <p className="mt-6 text-center text-sm text-ink-soft">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary">
            Create one free
          </Link>
        </p>
        {showDemoLogins && (
          <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-ink-soft">
            Demo accounts — Student: student@banglaenglish.app / student123 · Admin:
            admin@banglaenglish.app / admin123
          </div>
        )}
      </div>
    </div>
  );
}
