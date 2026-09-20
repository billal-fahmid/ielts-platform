"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Starts a mock test (or resumes the one in progress) and opens it. */
export function StartMockButton({ mockTestId, resume }: { mockTestId: string; resume?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/ielts/mock-test/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mockTestId }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.attemptId) {
      router.push(`/dashboard/ielts/mock-test/attempt/${data.attemptId}`);
      return;
    }
    setLoading(false);
    setError(data?.error ?? "We couldn't start the test. Please try again.");
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={start} loading={loading}>
        <Play className="h-4 w-4" /> {resume ? "Resume test" : "Start mock test"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
