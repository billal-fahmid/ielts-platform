/** Client-safe description of what a plan can unlock. The enforcement lives in lib/services/plans.ts. */
export const PLAN_FEATURES = [
  "IELTS_PRACTICE",
  "MOCK_TESTS",
  "ADVANCED_MOCK",
  "AI_TUTOR",
  "AI_WRITING",
  "AI_SPEAKING",
  "LIVE_CLASSES",
  "TEACHER_FEEDBACK",
  "ONE_ON_ONE",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  IELTS_PRACTICE: "IELTS Listening and Reading practice, study plan",
  MOCK_TESTS: "Full IELTS mock tests",
  ADVANCED_MOCK: "AI marking of mock-test Writing and Speaking",
  AI_TUTOR: "AI Tutor (English and বাংলা)",
  AI_WRITING: "AI Writing feedback",
  AI_SPEAKING: "AI Speaking practice and feedback",
  LIVE_CLASSES: "Live classes",
  TEACHER_FEEDBACK: "Teacher feedback on writing and speaking",
  ONE_ON_ONE: "1-on-1 speaking sessions",
};

export const PLAN_CODES = ["FREE", "BASIC", "PREMIUM", "PRO"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/** Where each gated area lives, so navigation can show a lock. */
export const FEATURE_ROUTES: { prefix: string; feature: PlanFeature }[] = [
  { prefix: "/dashboard/tutor", feature: "AI_TUTOR" },
  { prefix: "/dashboard/ielts/writing", feature: "AI_WRITING" },
  { prefix: "/dashboard/ielts/speaking", feature: "AI_SPEAKING" },
  { prefix: "/dashboard/ielts/mock-test", feature: "MOCK_TESTS" },
  { prefix: "/dashboard/ielts/listening", feature: "IELTS_PRACTICE" },
  { prefix: "/dashboard/ielts/reading", feature: "IELTS_PRACTICE" },
  { prefix: "/dashboard/ielts/plan", feature: "IELTS_PRACTICE" },
];

export const formatTaka = (amount: number) => `৳${amount.toLocaleString("en-US")}`;
