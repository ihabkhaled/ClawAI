import { z } from 'zod';

import { ADMIN_STATISTICS_USER_ID_MAX_LENGTH } from '../constants/admin-user-statistics-dto.constants';
import {
  EXPLORER_DEFAULT_LIMIT,
  EXPLORER_FILTER_MAX_LENGTH,
  EXPLORER_MAX_DAYS,
  EXPLORER_MAX_LIMIT,
  EXPLORER_SEARCH_MAX_LENGTH,
} from '../constants/admin-usage-explorer.constants';
import {
  UsageBillingKind,
  UsageLeaderboardDimension,
  UsageRequestSortField,
  UsageSortField,
} from '../enums/usage-cost-kind.enum';

export const isoInstant = z.string().datetime({ offset: true });
const MAX_CURSOR_LENGTH = 400;
const HOURS_PER_DAY = 24;

export const rangeShape = {
  hours: z.coerce
    .number()
    .int()
    .min(1)
    .max(EXPLORER_MAX_DAYS * HOURS_PER_DAY)
    .optional(),
  days: z.coerce.number().int().min(1).max(EXPLORER_MAX_DAYS).optional(),
  from: isoInstant.optional(),
  to: isoInstant.optional(),
};

export const filterShape = {
  provider: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH).optional(),
  model: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH).optional(),
  workflow: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH).optional(),
  billing: z.nativeEnum(UsageBillingKind).optional(),
};

const pageShape = {
  search: z.string().trim().min(1).max(EXPLORER_SEARCH_MAX_LENGTH).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(EXPLORER_MAX_LIMIT).default(EXPLORER_DEFAULT_LIMIT),
  cursor: z.string().min(1).max(MAX_CURSOR_LENGTH).optional(),
};

export type RangeFields = { hours?: number | undefined; days?: number | undefined };

/** Exactly one way to pick the window; `days` is folded into `hours`. */
export function rangeIsExclusive(
  q: RangeFields & { from?: string | undefined; to?: string | undefined },
) {
  const presets = [q.hours, q.days].filter((value) => value !== undefined).length;
  const explicit = q.from !== undefined || q.to !== undefined;
  return presets === 0 || (presets === 1 && !explicit);
}

export function foldDays<T extends RangeFields>(query: T): Omit<T, 'days'> {
  const { days, ...rest } = query;
  return days === undefined ? rest : { ...rest, hours: days * HOURS_PER_DAY };
}

export const RANGE_EXCLUSIVE_ISSUE = {
  message: 'use one of hours, days, or from/to',
  path: ['hours'],
};

export const explorerUsersQuerySchema = z
  .object({
    ...rangeShape,
    ...filterShape,
    ...pageShape,
    sort: z.nativeEnum(UsageSortField).default(UsageSortField.LAST_SEEN),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerUsersExportQuerySchema = z
  .object({ ...rangeShape, ...filterShape, ...pageShape })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerLeaderboardQuerySchema = z
  .object({
    ...rangeShape,
    ...filterShape,
    ...pageShape,
    dimension: z.nativeEnum(UsageLeaderboardDimension).default(UsageLeaderboardDimension.PROVIDER),
    sort: z.nativeEnum(UsageSortField).default(UsageSortField.COST),
    userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH).optional(),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerTimeseriesQuerySchema = z
  .object({
    ...rangeShape,
    ...filterShape,
    userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH).optional(),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerUserDetailQuerySchema = z
  .object({ ...rangeShape, ...filterShape })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerUserRequestsQuerySchema = z
  .object({
    ...rangeShape,
    ...filterShape,
    ...pageShape,
    sort: z.nativeEnum(UsageRequestSortField).default(UsageRequestSortField.TIME),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const explorerUserParamSchema = z.object({
  userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH),
});

export type ExplorerUsersQueryDto = z.infer<typeof explorerUsersQuerySchema>;
export type ExplorerUsersExportQueryDto = z.infer<typeof explorerUsersExportQuerySchema>;
export type ExplorerLeaderboardQueryDto = z.infer<typeof explorerLeaderboardQuerySchema>;
export type ExplorerTimeseriesQueryDto = z.infer<typeof explorerTimeseriesQuerySchema>;
export type ExplorerUserDetailQueryDto = z.infer<typeof explorerUserDetailQuerySchema>;
export type ExplorerUserRequestsQueryDto = z.infer<typeof explorerUserRequestsQuerySchema>;
export type ExplorerUserParamDto = z.infer<typeof explorerUserParamSchema>;
