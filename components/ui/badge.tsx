import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "success" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-dark",
  accent: "bg-accent-soft text-accent-dark",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-border/60 text-ink-soft",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
