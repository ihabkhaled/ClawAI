import { z } from 'zod';

/**
 * A Prometheus `query_range` answer, as far as the status page reads it.
 *
 * Validated rather than cast: the history is built from these numbers, and a
 * Prometheus that answers with an error body or another result type must fail
 * the read loudly, not produce a page of zeros.
 */
export const prometheusRangeResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    resultType: z.literal('matrix'),
    result: z
      .array(
        z.object({
          metric: z.record(z.string(), z.string()),
          values: z.array(z.tuple([z.number(), z.string()])).max(20_000),
        }),
      )
      .max(500),
  }),
});
