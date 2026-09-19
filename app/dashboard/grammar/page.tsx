import Link from "next/link";
import { listGrammarTopics } from "@/lib/services/grammar";
import { Card } from "@/components/ui/card";
import { Layers, ArrowRight } from "lucide-react";

export default function GrammarLabPage() {
  const topics = listGrammarTopics();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Grammar Lab</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Learn a rule, study examples, then practice — {topics.length} core topics.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => (
          <Link key={t.id} href={`/dashboard/grammar/${t.slug}`}>
            <Card className="flex h-full items-start gap-3 p-5 transition-shadow hover:shadow-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Layers className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-base text-ink">
                  {i + 1}. {t.title}
                </h2>
                <p className="mt-1 text-xs text-ink-soft line-clamp-2">{t.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-soft" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
