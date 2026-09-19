"use client";

import { useState } from "react";
import { CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export function LessonActions({
  lessonId,
  initialCompleted,
  initialBookmarked,
}: {
  lessonId: string;
  initialCompleted: boolean;
  initialBookmarked: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const markComplete = async () => {
    setLoading(true);
    const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      push("Could not update progress", "error");
      return;
    }
    setCompleted(true);
    if (!json.alreadyCompleted) {
      push(`Lesson complete! +${json.xp?.xp ? "XP earned" : ""}`.trim() || "Lesson complete!", "success");
      if (json.newlyAwarded?.length) {
        json.newlyAwarded.forEach((b: string) => push(`Badge earned: ${b}`, "success"));
      }
    }
    router.refresh();
  };

  const toggleBookmark = async () => {
    const res = await fetch(`/api/lessons/${lessonId}/bookmark`, { method: "POST" });
    const json = await res.json();
    if (res.ok) setBookmarked(json.bookmarked);
  };

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Button onClick={markComplete} loading={loading} disabled={completed} variant={completed ? "outline" : "primary"}>
        <CheckCircle2 className="h-4 w-4" /> {completed ? "Completed" : "Mark as complete"}
      </Button>
      <Button variant="ghost" onClick={toggleBookmark}>
        {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
    </div>
  );
}
