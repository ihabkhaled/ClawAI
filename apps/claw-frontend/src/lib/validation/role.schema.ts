import { z } from 'zod';

// Mirror of apps/claw-auth-service role DTOs. Slug is kebab-case (safe pattern,
// character classes only — no nested quantifiers per the ReDoS lint rule).
const ROLE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const NAME_MAX = 128;
const SLUG_MAX = 64;
const DESCRIPTION_MAX = 1000;

export const createRoleSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(SLUG_MAX, `Slug must be at most ${SLUG_MAX} characters`)
    .regex(ROLE_SLUG, 'Slug must be kebab-case'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
    .optional(),
  isAssignable: z.boolean().optional(),
  permissions: z.array(z.string().max(128)).max(200).optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;
