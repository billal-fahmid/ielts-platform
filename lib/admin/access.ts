/** Resources only administrators may touch: teachers must never see accounts, prices or payment details. */
export const ADMIN_ONLY_RESOURCES = new Set(["users", "plans", "coupons", "paymentAccounts"]);

/**
 * Teacher-owned content: teachers manage it through /api/teacher, which only lets them touch their own courses.
 * The generic admin API is for administrators here, so it can't be used to reach other teachers' content.
 */
export const TEACHER_OWNED_RESOURCES = new Set(["courses", "modules", "lessons", "quizzes", "questions"]);
