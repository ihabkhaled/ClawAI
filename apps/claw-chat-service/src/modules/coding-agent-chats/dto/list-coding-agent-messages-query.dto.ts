import { z } from 'zod';

export const listCodingAgentMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type ListCodingAgentMessagesQueryDto = z.infer<typeof listCodingAgentMessagesQuerySchema>;
