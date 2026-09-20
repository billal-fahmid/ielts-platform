"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Enrols the signed-in student. Once enrolled it offers to leave the course again. */
export function EnrollButton({ courseId, courseSlug, enrolled, size = "lg" }: { courseId: string; courseSlug: string; enrolled: boolean; size?: "md" | "lg" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const call = async (method: "POST" | "DELETE") => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/courses/${courseId}/enroll`, { method }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }
    setConfirmLeave(false);
    if (method === "POST") router.push(`/dashboard/courses/${courseSlug}`);
    else router.refresh();
  };

  if (enrolled) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success">
            <Check className="h-4 w-4" /> Enrolled
          </span>
          {!confirmLeave ? (
            <button type="button" onClick={() => setConfirmLeave(true)} className="text-xs text-ink-soft underline hover:text-ink">
              Leave course
            </button>
          ) : (
            <span role="alertdialog" aria-label="Leave this course?" className="flex items-center gap-2 text-xs text-ink-soft">
              Leave this course? Your progress is kept.
              <Button size="sm" variant="danger" onClick={() => call("DELETE")} loading={loading}>
                Leave
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmLeave(false)}>
                Stay
              </Button>
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size={size} onClick={() => call("POST")} loading={loading}>
        <GraduationCap className="h-4 w-4" /> Enroll for free
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
