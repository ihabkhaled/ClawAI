import { z } from 'zod';

export const draftChainFromNlSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export type DraftChainFromNlDto = z.infer<typeof draftChainFromNlSchema>;
