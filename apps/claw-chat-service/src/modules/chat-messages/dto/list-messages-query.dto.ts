import { z } from "zod";

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;
