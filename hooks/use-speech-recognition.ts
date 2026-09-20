"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionError = "denied" | "no-mic" | "network" | "unknown";
export type RecognitionResult = { transcript: string; pauseCount: number; totalPauseMs: number };

/** A gap this long between recogniser events counts as a pause. Approximate: no word-level timing exists. */
const PAUSE_MS = 2000;

function getRecognitionConstructor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Asks for microphone access up front so the permission prompt appears before the first question. */
export async function requestMicrophone(): Promise<"granted" | "denied" | "no-mic"> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "no-mic";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (err: any) {
    return err?.name === "NotFoundError" || err?.name === "OverconstrainedError" ? "no-mic" : "denied";
  }
}

/** Whether this browser can transcribe speech (Chrome and Edge can; Firefox cannot). null until mounted. */
export function useSpeechSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => setSupported(getRecognitionConstructor() !== null), []);
  return supported;
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState<RecognitionError | null>(null);

  const recRef = useRef<any>(null);
  const wantRef = useRef(false);
  const activeRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const lastActivityRef = useRef(0);
  const pauseCountRef = useRef(0);
  const pauseMsRef = useRef(0);
  const endWaitersRef = useRef<(() => void)[]>([]);

  /** `lang` is a BCP-47 tag such as "en-GB" or "bn-BD". */
  const start = useCallback((lang: string = "en-GB") => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      setError("unknown");
      return;
    }
    setError(null);
    finalRef.current = "";
    interimRef.current = "";
    lastActivityRef.current = 0;
    pauseCountRef.current = 0;
    pauseMsRef.current = 0;
    setLiveText("");

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: any) => {
      const now = Date.now();
      if (lastActivityRef.current && now - lastActivityRef.current > PAUSE_MS) {
        pauseCountRef.current += 1;
        pauseMsRef.current += now - lastActivityRef.current;
      }
      lastActivityRef.current = now;

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript + " ";
        else interim += result[0].transcript;
      }
      interimRef.current = interim;
      setLiveText((finalRef.current + interim).replace(/\s+/g, " ").trim());
    };

    rec.onerror = (event: any) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setError("denied");
          wantRef.current = false;
          break;
        case "audio-capture":
          setError("no-mic");
          wantRef.current = false;
          break;
        case "network":
          setError("network");
          wantRef.current = false;
          break;
        default:
          break; // "no-speech" and "aborted" are normal
      }
    };

    rec.onend = () => {
      // Browsers end a session after a stretch of silence; keep listening until told to stop.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through and finish */
        }
      }
      activeRef.current = false;
      setListening(false);
      endWaitersRef.current.splice(0).forEach((fn) => fn());
    };

    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      activeRef.current = true;
      setListening(true);
    } catch {
      wantRef.current = false;
      setError("unknown");
    }
  }, []);

  /** Stops listening and resolves with everything heard, including the last partial phrase. */
  const stop = useCallback(
    () =>
      new Promise<RecognitionResult>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve({
            transcript: (finalRef.current + interimRef.current).replace(/\s+/g, " ").trim(),
            pauseCount: pauseCountRef.current,
            totalPauseMs: pauseMsRef.current,
          });
        };
        wantRef.current = false;
        if (!recRef.current || !activeRef.current) return finish();
        endWaitersRef.current.push(finish);
        try {
          recRef.current.stop();
        } catch {
          finish();
        }
        setTimeout(finish, 2000);
      }),
    []
  );

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* already stopped */
      }
    },
    []
  );

  return { listening, liveText, error, start, stop };
}
