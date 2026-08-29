import { CREDIT_LEDGER_MAX_PAGE_SIZE, CREDIT_LEDGER_PAGE_SIZE } from '@claw/shared-constants';
import { z } from 'zod';

/**
 * Ledger paging.
 *
 * `limit` is capped so a heavy user cannot pull a year of spend in one request
 * — the ledger grows with every metered call, and an unbounded page would let a
 * single GET become the most expensive query in the service.
 *
 * `cursor` is an opaque row id from the previous page, not an offset: rows are
 * appended while a user reads, and an offset would repeat or skip a line every
 * time a request settled mid-scroll.
 */
export const creditLedgerQuerySchema = z.object({
  cursor: z.string().min(1).max(64).nullish(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CREDIT_LEDGER_MAX_PAGE_SIZE)
    .default(CREDIT_LEDGER_PAGE_SIZE),
});
export type CreditLedgerQueryDto = z.infer<typeof creditLedgerQuerySchema>;
