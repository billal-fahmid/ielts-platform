"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toSpeechSegments } from "@/lib/voice/speech-text";

/**
 * Reads text aloud with the browser's built-in voices. English and Bangla are spoken with separate
 * voices. Many devices have no Bangla voice; in that case the Bangla parts are skipped (never read
 * with an English voice, which would sound like gibberish) and `note` explains why.
 */
export function useReadAloud() {
  const [supported, setSupported] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    // Voices arrive asynchronously in Chrome and Edge.
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingKey(null);
  }, []);

  /** `key` identifies what is being read (e.g. a message id) so the UI can show which one is playing. */
  const speak = useCallback((key: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    setNote(null);

    const voices = voicesRef.current;
    const bnVoice = voices.find((v) => /^bn/i.test(v.lang));
    const enVoice = voices.find((v) => /^en-GB/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang));

    const segments = toSpeechSegments(text);
    const playable = segments.filter((s) => s.lang === "en" || bnVoice);
    if (segments.some((s) => s.lang === "bn") && !bnVoice) {
      setNote("This device has no Bangla voice installed, so the Bangla parts weren't read aloud. In Microsoft Edge, Bangla voices are available.");
    }
    if (playable.length === 0) {
      setSpeakingKey(null);
      return;
    }

    setSpeakingKey(key);
    playable.forEach((segment, i) => {
      const utterance = new SpeechSynthesisUtterance(segment.text);
      const voice = segment.lang === "bn" ? bnVoice : enVoice;
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? (segment.lang === "bn" ? "bn-BD" : "en-GB");
      utterance.rate = segment.lang === "bn" ? 0.9 : 0.95;
      if (i === playable.length - 1) {
        const done = () => setSpeakingKey((k) => (k === key ? null : k));
        utterance.onend = done;
        utterance.onerror = done;
      }
      synth.speak(utterance);
    });
  }, []);

  return { supported, speakingKey, note, speak, cancel };
}
