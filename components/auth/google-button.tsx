"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { safeRedirectPath } from "@/lib/security/redirect";

/** "Continue with Google". Sends people to Google, then back to the page they were heading to. */
export function GoogleButton({ callbackUrl, label = "Continue with Google" }: { callbackUrl?: string | null; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-5">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void signIn("google", { callbackUrl: safeRedirectPath(callbackUrl) });
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-primary-soft disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4.5 w-4.5">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
          <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
        </svg>
        {busy ? "Opening Google…" : label}
      </button>
      <div className="mt-5 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
