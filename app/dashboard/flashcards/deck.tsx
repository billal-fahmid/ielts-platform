"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCw, PartyPopper, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Word = { id: string; word: string; meaning: string; banglaMeaning: string | null; example: string | null };

export function FlashcardDeck({ words }: { words: Word[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  if (limitMessage) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center" data-testid="vocab-limit">
        <Lock className="h-8 w-8 text-primary" />
        <p className="font-display text-lg text-ink">Daily word limit reached</p>
        <p className="text-sm text-ink-soft">{limitMessage}</p>
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline">
          See plans
        </Link>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
        <PartyPopper className="h-8 w-8 text-accent" />
        <p className="font-display text-lg text-ink">You've learned every available word!</p>
        <p className="text-sm text-ink-soft">Check back after the admin adds more vocabulary.</p>
      </div>
    );
  }

  if (index >= words.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
        <PartyPopper className="h-8 w-8 text-accent" />
        <p className="font-display text-lg text-ink">Deck complete!</p>
        <Button
          onClick={() => {
            setIndex(0);
            router.refresh();
          }}
        >
          Start a new deck
        </Button>
      </div>
    );
  }

  const w = words[index];

  const rate = async (rating: "easy" | "medium" | "hard") => {
    setLoading(true);
    const res = await fetch(`/api/vocabulary/${w.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: rating }),
    });
    setLoading(false);
    if (res.status === 402) {
      const data = await res.json().catch(() => null);
      setLimitMessage(data?.error ?? "You've reached today's limit of new words.");
      return;
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-center text-xs text-ink-soft">
        Card {index + 1} of {words.length}
      </p>
      <button
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition-transform",
        )}
      >
        {!flipped ? (
          <>
            <span className="font-display text-3xl text-ink">{w.word}</span>
            <span className="mt-4 flex items-center gap-1.5 text-xs text-ink-soft">
              <RotateCw className="h-3.5 w-3.5" /> Tap to flip
            </span>
          </>
        ) : (
          <>
            <p className="text-lg text-ink">{w.meaning}</p>
            {w.banglaMeaning && <p className="mt-1 text-base text-primary">{w.banglaMeaning}</p>}
            {w.example && <p className="mt-3 text-sm italic text-ink-soft">"{w.example}"</p>}
          </>
        )}
      </button>

      {flipped && (
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Button variant="danger" onClick={() => rate("hard")} disabled={loading}>
            Hard
          </Button>
          <Button variant="outline" onClick={() => rate("medium")} disabled={loading}>
            Medium
          </Button>
          <Button variant="secondary" onClick={() => rate("easy")} disabled={loading}>
            Easy
          </Button>
        </div>
      )}
    </div>
  );
}
