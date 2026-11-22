import { z } from 'zod';

const noteSchema = z.string().trim().min(1).max(500).optional();

export const putPolicyBodySchema = z.object({
  /** Validated against livePolicySchema by the service, so the errors name the failing fields. */
  config: z.record(z.string(), z.unknown()),
  note: noteSchema,
});

export const rollbackPolicyBodySchema = z.object({
  version: z.number().int().min(1),
  note: noteSchema,
});

export type PutPolicyBody = z.infer<typeof putPolicyBodySchema>;
export type RollbackPolicyBody = z.infer<typeof rollbackPolicyBodySchema>;
