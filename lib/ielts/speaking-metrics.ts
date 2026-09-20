/**
 * Deterministic delivery metrics computed from a speech-recognition transcript. Browsers'
 * recognisers often drop "um"/"uh" and tidy up repetitions, so filler and repeat counts are
 * best read as minimums, and are presented that way in the UI.
 */

export type AudioMetrics = {
  wpm: number;
  pauseCount: number;
  totalPauseMs: number;
  fillerWordCount: number;
  repeatedWordCount: number;
  durationSeconds: number;
  typed?: boolean;
};

export type WordCount = { word: string; count: number };

const FILLERS = ["um", "umm", "uh", "uhh", "er", "erm", "ah", "hmm", "you know", "i mean"];

// Function words that are expected to repeat and are not "overused vocabulary".
const STOPWORDS = new Set(
  (
    "that this with have from they them their there were been would could should about because which when what where than then " +
    "your yours will just into over only also some such more most other these those being does done doing each both while " +
    "still even here very much many well"
  ).split(" ")
);

/** A content word used at least this many times in a session is reported as overused. */
export const OVERUSE_THRESHOLD = 4;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []) as string[];
}

export function countWords(text: string): number {
  return tokenize(text).length;
}

export function fillerBreakdown(text: string): WordCount[] {
  const lower = ` ${tokenize(text).join(" ")} `;
  return FILLERS.map((f) => ({ word: f, count: lower.split(` ${f} `).length - 1 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Immediate repetitions such as "the the" or "I I think". */
export function countImmediateRepeats(text: string): number {
  const tokens = tokenize(text);
  let repeats = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1] && !FILLERS.includes(tokens[i])) repeats++;
  }
  return repeats;
}

export function overusedWords(text: string, limit = 8): WordCount[] {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) {
    if (t.length < 4 || STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= OVERUSE_THRESHOLD)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Metrics for one answer. Pause data comes from the recogniser's event timing and is approximate. */
export function computeTurnMetrics(params: {
  transcript: string;
  durationSeconds: number;
  pauseCount?: number;
  totalPauseMs?: number;
  typed?: boolean;
}): AudioMetrics {
  const words = countWords(params.transcript);
  const duration = Math.max(0, Math.round(params.durationSeconds));
  const fillers = fillerBreakdown(params.transcript).reduce((sum, f) => sum + f.count, 0);
  return {
    wpm: duration >= 3 ? Math.round(words / (duration / 60)) : 0,
    pauseCount: params.pauseCount ?? 0,
    totalPauseMs: params.totalPauseMs ?? 0,
    fillerWordCount: fillers,
    repeatedWordCount: countImmediateRepeats(params.transcript),
    durationSeconds: duration,
    ...(params.typed ? { typed: true } : {}),
  };
}

export type SessionSummary = {
  totalWords: number;
  speakingSeconds: number;
  avgWpm: number;
  pauseCount: number;
  fillerCount: number;
  fillers: WordCount[];
  immediateRepeats: number;
  overused: WordCount[];
  anyTyped: boolean;
};

/** Session-level totals across every answer, used for the AI prompt and the results page. */
export function summariseSession(turns: { transcript: string; audioMetrics: AudioMetrics | null }[]): SessionSummary {
  const all = turns.map((t) => t.transcript).join(" ");
  const totalWords = countWords(all);
  const speakingSeconds = turns.reduce((s, t) => s + (t.audioMetrics?.durationSeconds ?? 0), 0);
  const fillers = fillerBreakdown(all);
  return {
    totalWords,
    speakingSeconds,
    avgWpm: speakingSeconds >= 3 ? Math.round(totalWords / (speakingSeconds / 60)) : 0,
    pauseCount: turns.reduce((s, t) => s + (t.audioMetrics?.pauseCount ?? 0), 0),
    fillerCount: fillers.reduce((s, f) => s + f.count, 0),
    fillers,
    immediateRepeats: turns.reduce((s, t) => s + countImmediateRepeats(t.transcript), 0),
    overused: overusedWords(all),
    anyTyped: turns.some((t) => t.audioMetrics?.typed),
  };
}
