import { z } from 'zod';

// Batch A3 — the in-chat password prompt for an encrypted archive. The cap on
// length is generous (no archive tool enforces one) but bounded, per rule 11:
// every string field gets a `.max()`. The password itself is never logged —
// see ArchiveEntriesService.submitPassword and skills/add-an-archive-format.md.
export const archivePasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .max(1024, 'Password must be at most 1024 characters'),
});

export type ArchivePasswordDto = z.infer<typeof archivePasswordSchema>;
