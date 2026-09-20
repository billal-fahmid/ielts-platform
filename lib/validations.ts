import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
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
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(254),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(2000, "Message is too long"),
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
