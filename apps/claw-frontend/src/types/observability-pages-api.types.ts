import type { ObservabilityListKind } from '@/enums/observability-list-kind.enum';

import type { SortOrder } from './observability-explorer.types';

/** The enum's values as a type, so a literal `'users'` is accepted where the enum is meant. */
export type ObservabilityEntityKind = `${ObservabilityListKind}`;

/** A list query: paging, sort and search, as the observability endpoints take them. */
export type ObservabilityListQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: SortOrder;
  search?: string;
};

/** What the CSV export takes of the table: the search and the order, never the paging. */
export type ObservabilityExportQuery = {
  search?: string;
  sort?: string;
  order?: SortOrder;
};
