"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Retries AI feedback for a saved submission or session; `endpoint` is the skill's evaluate route. */
export function RetryFeedback({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const retry = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch(endpoint, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (data?.evaluated) {
      router.refresh();
    } else {
      setMessage(data?.message ?? "Feedback is still unavailable. Please try again later.");
    }
  };

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      <Button onClick={retry} loading={loading} variant="outline">
        <RefreshCw className="h-4 w-4" /> {loading ? "Getting feedback…" : "Try again"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}
