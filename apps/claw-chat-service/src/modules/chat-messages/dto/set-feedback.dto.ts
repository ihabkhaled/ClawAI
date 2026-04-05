import { z } from "zod";

export const setFeedbackSchema = z.object({
  feedback: z.enum(["positive", "negative"]).nullable(),
});

export type SetFeedbackDto = z.infer<typeof setFeedbackSchema>;
