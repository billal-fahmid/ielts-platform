import { calculateReadingBand } from "./band-calculator";

/**
 * Combining section results into a mock-test band, following the published IELTS rules:
 *  - the overall band is the average of the four section bands, rounded to the nearest half band
 *    (an average ending in .25 rounds up to .5, and one ending in .75 rounds up to the next whole band);
 *  - in Writing, Task 2 carries twice the weight of Task 1.
 * Writing and Speaking bands are AI estimates, so an overall band that includes them is one too.
 */

export function roundToHalfBand(n: number): number {
  return Math.round(n * 2) / 2;
}

export function writingBand(task1: number, task2: number): number {
  return roundToHalfBand((task1 + 2 * task2) / 3);
}

/** All four section bands are needed; otherwise there is no honest overall band yet. */
export function overallBand(bands: { listening: number | null; reading: number | null; writing: number | null; speaking: number | null }): number | null {
  const values = [bands.listening, bands.reading, bands.writing, bands.speaking];
  if (values.some((v) => v === null)) return null;
  return roundToHalfBand((values as number[]).reduce((a, b) => a + b, 0) / 4);
}

/** Several reading passages are one test: pool the raw scores, then convert once. */
export function combinedReadingBand(
  attempts: { rawScore: number | null; totalQuestions: number | null }[],
  testType: "ACADEMIC" | "GENERAL_TRAINING"
): { band: number; raw: number; total: number } | null {
  if (attempts.length === 0) return null;
  const raw = attempts.reduce((sum, a) => sum + (a.rawScore ?? 0), 0);
  const total = attempts.reduce((sum, a) => sum + (a.totalQuestions ?? 0), 0);
  if (total === 0) return null;
  return { band: calculateReadingBand(raw, total, testType), raw, total };
}

/** Recommended sitting times, in seconds, used for the Writing section (Listening and Reading use their own limits). */
export const WRITING_SECTION_SECONDS = 60 * 60;
