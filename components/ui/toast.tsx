"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; message: string; kind: ToastKind };

const ToastContext = createContext<{ push: (message: string, kind?: ToastKind) => void }>({
  push: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
        suppressHydrationWarning
      >
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "flex items-start gap-2.5 rounded-lg border bg-surface p-3.5 shadow-lg text-sm",
                t.kind === "success" && "border-success/30",
                t.kind === "error" && "border-danger/30",
                t.kind === "info" && "border-border"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 mt-0.5",
                  t.kind === "success" && "text-success",
                  t.kind === "error" && "text-danger",
                  t.kind === "info" && "text-primary"
                )}
              />
              <p className="flex-1 text-ink">{t.message}</p>
              <button onClick={() => remove(t.id)} aria-label="Dismiss" className="text-ink-soft hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
