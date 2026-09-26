/** Chart colours come from the site theme, so they follow light and dark mode. */
const C = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  dark: "var(--color-primary-dark)",
  soft: "var(--color-ink-soft)",
  accentDark: "var(--color-accent-dark)",
};

export type Series = { key: string; label: string; color: string };

export const SERIES = {
  users: [
    { key: "newUsers", label: "New students", color: C.accent },
    { key: "activeUsers", label: "Active students", color: C.primary },
  ],
  revenue: [{ key: "revenue", label: "Revenue (net)", color: C.success }],
  enrollments: [{ key: "enrollments", label: "New enrolments", color: C.primary }],
  activity: [
    { key: "lesson", label: "Lessons", color: C.primary },
    { key: "quiz", label: "Quizzes", color: C.accent },
    { key: "practice", label: "IELTS practice", color: C.success },
    { key: "writing", label: "Essays", color: C.dark },
    { key: "speaking", label: "Speaking", color: C.accentDark },
    { key: "mock", label: "Mock tests", color: C.soft },
    { key: "ai", label: "AI tutor messages", color: "var(--color-danger)" },
  ],
} satisfies Record<string, Series[]>;
