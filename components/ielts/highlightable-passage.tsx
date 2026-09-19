"use client";

import { useRef, useState } from "react";
import { Highlighter, Eraser } from "lucide-react";

/**
 * Lets the student select passage text and mark it. Highlights are ephemeral (component state
 * only, not persisted) — this is a reading aid, not a graded or saved artifact.
 */
export function HighlightablePassage({ title, bodyText }: { title: string; bodyText: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasHighlights, setHasHighlights] = useState(false);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    if (!containerRef.current.contains(selection.anchorNode)) return;

    try {
      const range = selection.getRangeAt(0);
      const mark = document.createElement("mark");
      mark.className = "bg-accent-soft text-ink rounded-sm";
      range.surroundContents(mark);
      selection.removeAllRanges();
      setHasHighlights(true);
    } catch {
      // Selection crossed element boundaries (e.g. spans multiple paragraphs) — skip silently.
      selection.removeAllRanges();
    }
  };

  const clearHighlights = () => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll("mark").forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    setHasHighlights(false);
  };

  const paragraphs = bodyText.split(/\n{2,}/);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <div className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
          <Highlighter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Select text to highlight</span>
          {hasHighlights && (
            <button onClick={clearHighlights} className="flex items-center gap-1 text-primary hover:underline">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="mt-4 select-text text-sm leading-relaxed text-ink [&_mark]:px-0.5"
      >
        {paragraphs.map((p, i) => (
          <p key={i} className={i > 0 ? "mt-4" : ""}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
