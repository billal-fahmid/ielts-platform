"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

type Kind = "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT";
const ACCEPT: Record<Kind, string> = {
  VIDEO: "video/mp4,video/webm",
  AUDIO: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a",
  IMAGE: "image/png,image/jpeg,image/webp",
  DOCUMENT: "application/pdf",
};

/** Picks a file, uploads it with a progress bar, and hands back its link. The server checks the real file type. */
export function UploadButton({ kinds, visibility = "MEMBERS", onUploaded }: { kinds: Kind[]; visibility?: "PUBLIC" | "MEMBERS" | "PRIVATE"; onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = (file: File) => {
    setError(null);
    setProgress(0);
    const form = new FormData();
    form.append("file", file);
    form.append("kinds", kinds.join(","));
    form.append("visibility", visibility);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) onUploaded(data.url);
      else setError(data?.error ?? "The upload failed. Please try again.");
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("The upload failed. Check your connection and try again.");
    };
    xhr.send(form);
  };

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <input
        ref={input}
        type="file"
        hidden
        accept={kinds.map((k) => ACCEPT[k]).join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={() => input.current?.click()} disabled={progress !== null} className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-primary-soft disabled:opacity-60">
        <Upload className="h-3.5 w-3.5" /> {progress !== null ? `Uploading… ${progress}%` : `Upload ${kinds.map((k) => k.toLowerCase()).join(" / ")}`}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
