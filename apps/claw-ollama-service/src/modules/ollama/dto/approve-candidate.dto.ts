import { z } from 'zod';
import { ModelCategory } from '../../../generated/prisma';

export const approveCandidateSchema = z.object({
  overrides: z
    .object({
      displayName: z.string().trim().max(120).optional(),
      category: z.nativeEnum(ModelCategory).optional(),
      businessCategories: z.array(z.string().max(64)).max(20).optional(),
      hardwareProfiles: z.array(z.string().max(32)).max(10).optional(),
      description: z.string().max(1000).optional(),
      isRecommended: z.boolean().optional(),
    })
    .optional(),
});
export type ApproveCandidateDto = z.infer<typeof approveCandidateSchema>;

export const rejectCandidateSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type RejectCandidateDto = z.infer<typeof rejectCandidateSchema>;

export const bulkApproveSchema = z.object({
  candidateIds: z.array(z.string().trim().min(1).max(64)).min(1).max(100),
});
export type BulkApproveDto = z.infer<typeof bulkApproveSchema>;
