import { z } from "zod";

/** The body for scheduling or editing a live class. `startsAtLocal` is Bangladesh time, e.g. 2026-10-05T18:30. */
export const classSchema = z.object({
  title: z.string().min(1, "Give the class a title."),
  description: z.string().nullish(),
  batchId: z.string().nullish(),
  courseId: z.string().nullish(),
  startsAtLocal: z.string().min(1, "Choose a date and time."),
  durationMinutes: z.number("Choose how long the class is."),
  provider: z.string().min(1, "Choose how the class will be held."),
  meetingUrl: z.string().nullish(),
});
