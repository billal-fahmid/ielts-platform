"use client";

import { useEffect } from "react";

/** Last-resort boundary for errors in the root layout. Uses no app components, because those may be what failed. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message?.slice(0, 500) || "Unknown error", digest: error.digest, path: window.location.pathname }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f5f3f1", color: "#1a1a1a", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ maxWidth: 420, fontSize: 14, color: "#555" }}>The problem has been reported. Please try again.</p>
          <button onClick={reset} style={{ background: "#c8102e", color: "#fff", border: 0, borderRadius: 999, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
