import { z } from 'zod';
import {
  OBSERVABILITY_DEFAULT_HOURS,
  OBSERVABILITY_DEFAULT_LIMIT,
  OBSERVABILITY_MAX_HOURS,
  OBSERVABILITY_MAX_LIMIT,
  OBSERVABILITY_SEARCH_MAX_LENGTH,
} from '../constants/observability.constants';

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const common = {
  hours: z.coerce
    .number()
    .int()
    .min(1)
    .max(OBSERVABILITY_MAX_HOURS)
    .default(OBSERVABILITY_DEFAULT_HOURS),
  search: z.string().trim().min(1).max(OBSERVABILITY_SEARCH_MAX_LENGTH).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(OBSERVABILITY_MAX_LIMIT)
    .default(OBSERVABILITY_DEFAULT_LIMIT),
};

export const failuresQuerySchema = z.object({
  ...common,
  includeSync: booleanFlag.default(false),
  sort: z.enum(['count', 'lastSeen']).default('count'),
});

export const tracingQuerySchema = z.object({
  ...common,
  dimension: z.enum(['provider', 'model', 'context']).default('provider'),
  sort: z.enum(['requests', 'p95', 'tokens']).default('requests'),
});

export type FailuresQueryDto = z.infer<typeof failuresQuerySchema>;
export type TracingQueryDto = z.infer<typeof tracingQuerySchema>;
