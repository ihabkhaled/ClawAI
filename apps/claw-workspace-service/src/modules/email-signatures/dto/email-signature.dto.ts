import { z } from 'zod';

// v3 round 5 (2026-05-12) — Prompt 06 polish: Gmail signature library.
// Strict bounds match the DB column lengths so we never write a row
// that violates the schema at insert time.

export const createEmailSignatureSchema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1).max(8000),
  isDefault: z.boolean().optional(),
});

export type CreateEmailSignatureDto = z.infer<typeof createEmailSignatureSchema>;

export const updateEmailSignatureSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(8000).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateEmailSignatureDto = z.infer<typeof updateEmailSignatureSchema>;
