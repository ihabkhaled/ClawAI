import { z } from 'zod';

/**
 * V2 Stream 08 — bulk-approve multiple capability invocations in one
 * request. Each id is approved independently; partial success is
 * reported in the response.
 *
 * Cap: 100 ids per request to bound the worst-case server-side cost
 * (each id triggers a real CapabilityApprovalManager.approve call,
 * which publishes an event and updates the DB).
 */
export const bulkApproveCapabilitySchema = z.object({
  invocationIds: z.array(z.string().cuid()).min(1).max(100),
});

export type BulkApproveCapabilityDto = z.infer<typeof bulkApproveCapabilitySchema>;
