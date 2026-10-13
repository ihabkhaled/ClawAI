import { z } from 'zod';

import {
  OBS_DEFAULT_LIMIT,
  OBS_MAX_LIMIT,
  OBS_MAX_PAGE,
} from '../constants/admin-observability.constants';
import { ADMIN_STATISTICS_USER_ID_MAX_LENGTH } from '../constants/admin-user-statistics-dto.constants';
import {
  EXPLORER_FILTER_MAX_LENGTH,
  EXPLORER_SEARCH_MAX_LENGTH,
} from '../constants/admin-usage-explorer.constants';
import { ObservabilitySortField } from '../enums/usage-cost-kind.enum';
import {
  filterShape,
  foldDays,
  RANGE_EXCLUSIVE_ISSUE,
  rangeIsExclusive,
  rangeShape,
} from './admin-usage-explorer.dto';

/** Every filter the shared bar sends: the explorer filters plus plan and one user. */
const scopeShape = {
  ...rangeShape,
  ...filterShape,
  plan: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH).optional(),
  userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH).optional(),
};

const listShape = {
  search: z.string().trim().min(1).max(EXPLORER_SEARCH_MAX_LENGTH).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(OBS_MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(OBS_MAX_LIMIT).default(OBS_DEFAULT_LIMIT),
  sort: z.nativeEnum(ObservabilitySortField).default(ObservabilitySortField.COST),
};

/** Overview, filter options and health: a window and filters, nothing paged. */
export const observabilityScopeQuerySchema = z
  .object(scopeShape)
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

/** Users, providers, models, plans and workflows lists. */
export const observabilityListQuerySchema = z
  .object({ ...scopeShape, ...listShape })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

/** The users list default sort is the most recent activity, like the old table. */
export const observabilityUsersQuerySchema = z
  .object({
    ...scopeShape,
    ...listShape,
    sort: z.nativeEnum(ObservabilitySortField).default(ObservabilitySortField.LAST_SEEN),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const observabilityExportQuerySchema = z
  .object({
    ...scopeShape,
    search: listShape.search,
    order: listShape.order,
    sort: listShape.sort,
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

/** Provider detail: the provider is the path parameter, so a provider filter would contradict it. */
export const observabilityProviderDetailQuerySchema = z
  .object(scopeShape)
  .omit({ provider: true, model: true })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export const observabilityProviderParamSchema = z.object({
  provider: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH),
});

/** Model detail: a model id contains `/` and `:`, so provider and model travel in the query string. */
export const observabilityModelDetailQuerySchema = z
  .object({
    ...scopeShape,
    provider: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH),
    model: z.string().trim().min(1).max(EXPLORER_FILTER_MAX_LENGTH),
  })
  .refine(rangeIsExclusive, RANGE_EXCLUSIVE_ISSUE)
  .transform(foldDays);

export type ObservabilityScopeQueryDto = z.infer<typeof observabilityScopeQuerySchema>;
export type ObservabilityListQueryDto = z.infer<typeof observabilityListQuerySchema>;
export type ObservabilityUsersQueryDto = z.infer<typeof observabilityUsersQuerySchema>;
export type ObservabilityExportQueryDto = z.infer<typeof observabilityExportQuerySchema>;
export type ObservabilityProviderDetailQueryDto = z.infer<
  typeof observabilityProviderDetailQuerySchema
>;
export type ObservabilityProviderParamDto = z.infer<typeof observabilityProviderParamSchema>;
export type ObservabilityModelDetailQueryDto = z.infer<typeof observabilityModelDetailQuerySchema>;
