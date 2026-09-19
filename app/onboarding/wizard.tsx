"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Briefcase, Plane, Sparkles, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { LEVEL_LABELS, LEVELS } from "@/lib/utils";

type Data = {
  englishLevel: string;
  ieltsTarget: number;
  targetExamDate: string;
  reason: string;
  focusSkill: string;
};

const reasons = [
  { value: "STUDY_ABROAD", label: "Study abroad", icon: GraduationCap },
  { value: "WORK", label: "Work opportunities", icon: Briefcase },
  { value: "IMMIGRATION", label: "Immigration", icon: Plane },
  { value: "PERSONAL", label: "Personal development", icon: Sparkles },
];

const skills = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"];

const steps = ["Level", "Target band", "Exam date", "Goal", "Focus"];

export function OnboardingWizard() {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data>({
    englishLevel: "",
    ieltsTarget: 7,
    targetExamDate: "",
    reason: "",
    focusSkill: "",
  });

  const canNext =
    (step === 0 && data.englishLevel) ||
    (step === 1 && data.ieltsTarget) ||
    (step === 2 && data.targetExamDate) ||
    (step === 3 && data.reason) ||
    (step === 4 && data.focusSkill);

  const submit = async () => {
    setLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      push("Something went wrong — please try again", "error");
      return;
    }
    push("Profile saved! Let's find your English level.", "success");
    router.push("/dashboard/assessment");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                i < step && "bg-success text-white",
                i === step && "bg-primary text-white",
                i > step && "bg-primary-soft text-ink-soft"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={cn("h-0.5 flex-1", i < step ? "bg-success" : "bg-border")} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8">
        {step === 0 && (
          <Step title="What is your current English level?" subtitle="Don't worry — you'll take a quick placement test next.">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <OptionCard
                  key={l}
                  selected={data.englishLevel === l}
                  onClick={() => setData((d) => ({ ...d, englishLevel: l }))}
                  title={l}
                  subtitle={LEVEL_LABELS[l]}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="What is your IELTS target band?" subtitle="Choose the band score you're aiming for.">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="font-display text-5xl text-primary">{data.ieltsTarget.toFixed(1)}</div>
              <input
                type="range"
                min={4}
                max={9}
                step={0.5}
                value={data.ieltsTarget}
                onChange={(e) => setData((d) => ({ ...d, ieltsTarget: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex w-full justify-between text-xs text-ink-soft">
                <span>4.0</span>
                <span>9.0</span>
              </div>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="When do you plan to take IELTS?" subtitle="We'll build your study plan around this date.">
            <input
              type="date"
              value={data.targetExamDate}
              onChange={(e) => setData((d) => ({ ...d, targetExamDate: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </Step>
        )}

        {step === 3 && (
          <Step title="Why are you learning English?" subtitle="This helps us recommend the right courses.">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {reasons.map((r) => (
                <OptionCard
                  key={r.value}
                  selected={data.reason === r.value}
                  onClick={() => setData((d) => ({ ...d, reason: r.value }))}
                  title={r.label}
                  icon={r.icon}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="Which skill do you want to improve most?" subtitle="We'll prioritize this in your recommendations.">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {skills.map((s) => (
                <OptionCard
                  key={s}
                  selected={data.focusSkill === s}
                  onClick={() => setData((d) => ({ ...d, focusSkill: s }))}
                  title={s.charAt(0) + s.slice(1).toLowerCase()}
                />
              ))}
            </div>
          </Step>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={loading} disabled={!canNext}>
              Finish setup <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-1 mb-6 text-sm text-ink-soft">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  icon: Icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
      )}
    >
      {Icon && (
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", selected ? "bg-primary text-white" : "bg-bg text-ink-soft")}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      )}
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        {subtitle && <span className="block text-xs text-ink-soft">{subtitle}</span>}
      </span>
    </button>
  );
}
