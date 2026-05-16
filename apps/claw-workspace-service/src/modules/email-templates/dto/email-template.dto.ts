import { z } from 'zod';

// v3 round 9 (2026-05-14) — Prompt 06 polish: email template library.
// Strict bounds match the DB column lengths so we never write a row
// that violates the schema at insert time. Unlike a signature, a
// template carries a subject as well as a body.

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(16_000),
  isDefault: z.boolean().optional(),
});

export type CreateEmailTemplateDto = z.infer<typeof createEmailTemplateSchema>;

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(16_000).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateEmailTemplateDto = z.infer<typeof updateEmailTemplateSchema>;
