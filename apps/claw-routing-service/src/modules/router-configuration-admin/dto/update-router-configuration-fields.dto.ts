import { z } from 'zod';
import { LowConfidenceAction, RouterConfigurationMode } from '../../../generated/prisma';

/** Partial update for a DRAFT revision's own configuration-level settings —
 * everything on `RouterConfiguration` that is not a chain entry and not the
 * publish/enable lifecycle (those have their own endpoints). Every field is
 * optional: the caller sends only what it wants to change, and anything
 * omitted keeps the draft's current (copy-on-write-inherited) value. At
 * least one field is required so an empty PATCH does not silently no-op. */
export const updateRouterConfigurationFieldsSchema = z
  .object({
    mode: z.nativeEnum(RouterConfigurationMode).optional(),
    totalDeadlineMs: z.number().int().min(100).max(600_000).optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    maxRouterInputTokens: z.number().int().min(1).max(1_000_000).optional(),
    maxRouterOutputTokens: z.number().int().min(1).max(100_000).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    lowConfidenceAction: z.nativeEnum(LowConfidenceAction).optional(),
    failClosedWhenNoEligibleRouter: z.boolean().optional(),
    skipProviderOnProviderWideFailure: z.boolean().optional(),
    safeTraceLevel: z.string().min(1).max(50).optional(),
    legacyLocalRollbackEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateRouterConfigurationFieldsDto = z.infer<
  typeof updateRouterConfigurationFieldsSchema
>;
