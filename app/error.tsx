"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/** Shown when a page crashes. The error is reported to the admin error log; the visitor sees a calm message, never a stack trace. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message?.slice(0, 500) || "Unknown error", digest: error.digest, path: window.location.pathname }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink-soft">We hit a problem loading this page. It has been reported. You can try again, or go back to the dashboard.</p>
      {error.digest && <p className="text-xs text-ink-soft">Reference: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard" className="inline-flex items-center rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-soft">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
