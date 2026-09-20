/**
 * Deterministic raw-score -> IELTS band conversion for objective sections (Reading, Listening).
 * These tables follow the commonly published approximate conversion used across IELTS practice
 * materials — the real exam's conversion shifts slightly test to test, so results are always
 * presented as an estimate, not an official score.
 *
 * Tables are calibrated to a standard 40-question test. A practice attempt with a different
 * question count is scaled proportionally to a 40-question-equivalent raw score before lookup.
 */

type BandTableRow = { min: number; band: number };

// Raw score (out of 40) -> band, descending.
const READING_ACADEMIC: BandTableRow[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
];

const READING_GENERAL: BandTableRow[] = [
  { min: 40, band: 9 },
  { min: 39, band: 8.5 },
  { min: 37, band: 8 },
  { min: 36, band: 7.5 },
  { min: 34, band: 7 },
  { min: 32, band: 6.5 },
  { min: 30, band: 6 },
  { min: 27, band: 5.5 },
  { min: 23, band: 5 },
  { min: 19, band: 4.5 },
  { min: 15, band: 4 },
  { min: 12, band: 3.5 },
  { min: 9, band: 3 },
];

const LISTENING: BandTableRow[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 7, band: 3.5 },
];

function lookup(table: BandTableRow[], scaledScore: number): number {
  for (const row of table) {
    if (scaledScore >= row.min) return row.band;
  }
  // Below the lowest published threshold: any correct answer still earns band 1; none earns 0.
  return scaledScore > 0 ? 1 : 0;
}

function scaleTo40(rawScore: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((rawScore / totalQuestions) * 40);
}

export function calculateReadingBand(
  rawScore: number,
  totalQuestions: number,
  testType: "ACADEMIC" | "GENERAL_TRAINING"
): number {
  const scaled = scaleTo40(rawScore, totalQuestions);
  const table = testType === "GENERAL_TRAINING" ? READING_GENERAL : READING_ACADEMIC;
  return lookup(table, scaled);
}

export function calculateListeningBand(rawScore: number, totalQuestions: number): number {
  const scaled = scaleTo40(rawScore, totalQuestions);
  return lookup(LISTENING, scaled);
}
