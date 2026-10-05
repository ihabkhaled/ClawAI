import { z } from 'zod';

export const createPublicationReportSchema = z.object({
  commentId: z.string().min(1).max(128).optional(),
  reason: z.enum(['SPAM', 'ABUSE', 'PRIVATE_INFORMATION', 'UNSAFE_CONTENT', 'OTHER']),
  details: z.string().trim().max(1000).optional(),
});

export type CreatePublicationReportDto = z.infer<typeof createPublicationReportSchema>;
