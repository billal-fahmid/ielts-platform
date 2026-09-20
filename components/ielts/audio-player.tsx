"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Play/pause only — no seeking, to mirror a real IELTS recording. */
export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setFailed(false);
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setFailed(true));
    else audio.pause();
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />

      {failed ? (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          The audio could not be loaded. Refresh the page or try again later.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label={playing ? "Pause audio" : "Play audio"}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
              )}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
            </button>
            <div className="flex-1">
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full overflow-hidden rounded-full bg-primary-soft"
              >
                <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <Volume2 className="hidden h-4 w-4 shrink-0 text-ink-soft sm:block" />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            In the real test you hear each recording once. Use pause only if you need to.
          </p>
        </>
      )}
    </div>
  );
}
