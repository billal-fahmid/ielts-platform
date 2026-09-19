"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Word = {
  id: string;
  word: string;
  meaning: string;
  banglaMeaning: string | null;
  pronunciation: string | null;
  example: string | null;
  synonym: string | null;
  antonym: string | null;
  difficulty: string;
  category: string;
  status: string;
};

const tabs = [
  { key: "daily", label: "Daily" },
  { key: "mine", label: "My Vocabulary" },
  { key: "ielts", label: "IELTS" },
  { key: "academic", label: "Academic" },
];

export function VocabularyTabs({
  daily,
  ielts,
  academic,
  mine,
}: {
  daily: Word[];
  ielts: Word[];
  academic: Word[];
  mine: Word[];
}) {
  const [tab, setTab] = useState("daily");
  const data: Record<string, Word[]> = { daily, ielts, academic, mine };

  return (
    <div className="mt-6">
      <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
            )}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">({data[t.key].length})</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {data[tab].length === 0 && (
          <p className="text-sm text-ink-soft">
            {tab === "mine" ? "You haven't added any words yet." : "No words here yet."}
          </p>
        )}
        {data[tab].map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
      </div>
    </div>
  );
}

function WordCard({ word }: { word: Word }) {
  const router = useRouter();
  const { push } = useToast();
  const [status, setStatus] = useState(word.status);
  const [loading, setLoading] = useState(false);

  const act = async (action: "learned" | "difficult") => {
    setLoading(true);
    const res = await fetch(`/api/vocabulary/${word.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus(action === "learned" ? "LEARNED" : "DIFFICULT");
      if (action === "learned") push("Nice! +5 XP", "success");
      router.refresh();
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg text-ink">{word.word}</h3>
          {word.pronunciation && <p className="text-xs text-ink-soft">{word.pronunciation}</p>}
        </div>
        <Badge tone={word.difficulty === "HARD" ? "danger" : word.difficulty === "MEDIUM" ? "accent" : "success"}>
          {word.difficulty}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-ink">{word.meaning}</p>
      {word.banglaMeaning && <p className="text-sm text-primary">{word.banglaMeaning}</p>}
      {word.example && <p className="mt-2 text-sm italic text-ink-soft">"{word.example}"</p>}
      <div className="mt-2 flex gap-3 text-xs text-ink-soft">
        {word.synonym && <span>Syn: {word.synonym}</span>}
        {word.antonym && <span>Ant: {word.antonym}</span>}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {status === "LEARNED" ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" /> Learned
          </Badge>
        ) : status === "DIFFICULT" ? (
          <Badge tone="danger">
            <AlertCircle className="h-3 w-3" /> Difficult
          </Badge>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => act("learned")} disabled={loading}>
              <Plus className="h-3.5 w-3.5" /> Mark learned
            </Button>
            <Button size="sm" variant="ghost" onClick={() => act("difficult")} disabled={loading}>
              Mark difficult
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
