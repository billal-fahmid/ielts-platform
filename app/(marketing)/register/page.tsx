import { Metadata } from "next";
import { RegisterForm } from "./register-form";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Create account — BanglaEnglish" };

export default function RegisterPage() {
  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl text-ink">Start learning free</h1>
          <p className="mt-1 text-sm text-ink-soft">Create your account and take your placement test.</p>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
