import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary outline-none transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary outline-none transition-colors",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-primary outline-none transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Field({
  label,
  error,
  children,
  hint,
  group,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  /** For a set of checkboxes: a labelled group instead of a single <label> (labels can't be nested). */
  group?: boolean;
}) {
  if (group) {
    return (
      <div role="group" aria-label={label} className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
        {children}
        {hint && !error && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
        {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
      </div>
    );
  }
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
