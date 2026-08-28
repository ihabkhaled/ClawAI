import { z } from 'zod';

/**
 * Where to cut the copy.
 *
 * The branch holds every message up to and including this one. The id is
 * checked against the thread in the service, so a message from another
 * conversation cannot be used to graft its history onto this one.
 */
export const branchThreadSchema = z.object({
  fromMessageId: z.string().max(255, 'Message ID must be at most 255 characters'),
});

export type BranchThreadDto = z.infer<typeof branchThreadSchema>;
