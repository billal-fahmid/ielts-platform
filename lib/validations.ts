import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingSchema = z.object({
  englishLevel: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  ieltsTarget: z.coerce.number().min(1).max(9),
  targetExamDate: z.string().min(1, "Please pick a date"),
  reason: z.enum(["STUDY_ABROAD", "WORK", "IMMIGRATION", "PERSONAL"]),
  focusSkill: z.enum(["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"]),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10, "Message should be at least 10 characters"),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  education: z.string().optional(),
  countryGoal: z.string().optional(),
  dailyGoalMinutes: z.coerce.number().min(5).max(240).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
