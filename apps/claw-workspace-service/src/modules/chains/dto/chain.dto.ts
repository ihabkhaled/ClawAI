import { z } from 'zod';

// v3 round 12 (2026-05-14) — Prompt 11: cross-workspace chain DTOs.
// Strict bounds on every string/array so a malicious DSL can't blow
// past the DB columns or pin the executor.

const chainStepSchema = z.object({
  // Step id — referenced by {{steps.<id>.output.*}} placeholders. Kept
  // to a safe identifier charset so placeholder parsing stays simple.
  id: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/, 'step id must be alphanumeric / _ / -'),
  connectorId: z.string().min(1).max(128),
  actionType: z.string().min(1).max(64),
  // Arbitrary JSON payload — the executor resolves placeholders before
  // handing it to the adapter. Capped indirectly by the body limit.
  payload: z.record(z.string(), z.unknown()),
});

export const chainDslSchema = z.object({
  // 1-20 steps — a chain longer than 20 is almost certainly a mistake
  // and would take too long to run synchronously.
  steps: z.array(chainStepSchema).min(1).max(20),
});

export type ChainDslDto = z.infer<typeof chainDslSchema>;

export const createChainSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  dsl: chainDslSchema,
  isEnabled: z.boolean().optional(),
});

export type CreateChainDto = z.infer<typeof createChainSchema>;

export const updateChainSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  dsl: chainDslSchema.optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateChainDto = z.infer<typeof updateChainSchema>;
