"use client";

import { useCallback, useEffect, useState } from "react";

/** Reads examiner questions aloud with the browser's built-in speech synthesis. */
export function useExaminerVoice() {
  const [enabled, setEnabled] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => setAvailable(typeof window !== "undefined" && "speechSynthesis" in window), []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\s*\n+\s*/g, ". "));
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => /en-GB/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    },
    [enabled]
  );

  useEffect(() => cancel, [cancel]);

  return { available, enabled, setEnabled, speak, cancel };
}
