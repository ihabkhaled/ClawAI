import type { ModelBillingFilter } from '@/enums/model-billing.enum';
import type {
  ModelPricingSource,
  ModelPricingSourceFilter,
} from '@/enums/model-pricing-source.enum';
import type { CostClass } from '@/enums/router-models.enum';

import type { TranslateFunction } from './i18n.types';
import type {
  ModelBillingCounts,
  ModelBillingInfo,
  ProviderCreditPolicy,
} from './model-billing.types';

// ─── Backend DTO mirrors (claw-routing-service router-models/costs) ──────────

/**
 * One row of `GET /router-models/costs/catalog`.
 *
 * Every rate is an INTEGER of micro-USD per million tokens — 2_500_000 means
 * $2.50 / 1M tokens. It stays an integer through the repository, the hook and
 * the table; only the cell renderer turns it into a string. Money never
 * becomes a float on this path.
 */
export type ModelCostCatalogRow = {
  provider: string;
  modelKey: string;
  displayName: string | null;
  pricingSource: ModelPricingSource;
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
  cachedInputPerMillionMicroUsd: number | null;
  costClass: string;
  isAdminOverride: boolean;
  version: number;
  lastVerifiedAt: string | null;
};

/**
 * Body of `POST /router-models/costs`. Publishing mints a NEW immutable
 * version and pins the model as an admin override, which automated sync will
 * then refuse to overwrite.
 */
export type PublishModelCostRequest = {
  provider: string;
  modelKey: string;
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
  cachedInputPerMillionMicroUsd: number | null;
  costClass: CostClass;
};

export type PublishModelCostResponse = {
  version: number;
};

// ─── Form ───────────────────────────────────────────────────────────────────

/**
 * The edit dialog's fields as the operator types them: dollars per million
 * tokens, as raw strings. Strings rather than numbers so a half-typed "2." is
 * representable and so the conversion to integer micro-USD happens exactly
 * once, on submit, in `dollarsPerMillionToMicroUsd`.
 */
export type ModelCostFormState = {
  inputDollarsPerMillion: string;
  outputDollarsPerMillion: string;
  cachedInputDollarsPerMillion: string;
  costClass: CostClass;
};

export type ModelCostFormErrors = {
  inputDollarsPerMillion: string | null;
  outputDollarsPerMillion: string | null;
  cachedInputDollarsPerMillion: string | null;
};

export type UseModelCostFormResult = {
  state: ModelCostFormState;
  errors: ModelCostFormErrors;
  isValid: boolean;
  setInputDollarsPerMillion: (value: string) => void;
  setOutputDollarsPerMillion: (value: string) => void;
  setCachedInputDollarsPerMillion: (value: string) => void;
  setCostClass: (value: CostClass) => void;
  buildRequest: () => PublishModelCostRequest | null;
};

// ─── Hook results ───────────────────────────────────────────────────────────

export type UseModelCostCatalogResult = {
  rows: ModelCostCatalogRow[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export type UseModelCostFiltersResult = {
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter;
  setSourceFilter: (value: ModelPricingSource | ModelPricingSourceFilter) => void;
  search: string;
  setSearch: (value: string) => void;
};

export type UsePublishModelCostResult = {
  publish: (request: PublishModelCostRequest) => void;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
};

export type UseModelCostEditDialogResult = {
  isOpen: boolean;
  editing: ModelCostCatalogRow | null;
  open: (row: ModelCostCatalogRow) => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

export type UseModelCostBillingResult = {
  policy: ProviderCreditPolicy;
  isPolicyError: boolean;
  billingFilter: ModelBillingFilter;
  setBillingFilter: (value: ModelBillingFilter) => void;
  counts: ModelBillingCounts;
  resolveBilling: (row: ModelCostCatalogRow) => ModelBillingInfo;
};

/** Per-source row counts, so the banner can name the work without recounting. */
export type ModelCostSourceCounts = Record<ModelPricingSource, number>;

export type UseModelCostsPageResult = {
  t: TranslateFunction;
  // The rows on screen now ("Show more" pages through the filtered list).
  rows: ModelCostCatalogRow[];
  filteredCount: number;
  hasMore: boolean;
  onShowMore: () => void;
  totalCount: number;
  billingFilter: ModelBillingFilter;
  onBillingFilterChange: (value: ModelBillingFilter) => void;
  billingCounts: ModelBillingCounts;
  resolveBilling: (row: ModelCostCatalogRow) => ModelBillingInfo;
  isPolicyError: boolean;
  activeFilterCount: number;
  counts: ModelCostSourceCounts;
  needsAttentionCount: number;
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter;
  onSourceFilterChange: (value: ModelPricingSource | ModelPricingSourceFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  editing: ModelCostCatalogRow | null;
  isDialogOpen: boolean;
  onEdit: (row: ModelCostCatalogRow) => void;
  onDialogOpenChange: (open: boolean) => void;
  onSubmit: (request: PublishModelCostRequest) => void;
  isPublishing: boolean;
  publishError: Error | null;
};

// ─── Component prop types ───────────────────────────────────────────────────

export type ModelCostFilterBarProps = {
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter;
  counts: ModelCostSourceCounts;
  totalCount: number;
  search: string;
  onSourceFilterChange: (value: ModelPricingSource | ModelPricingSourceFilter) => void;
  onSearchChange: (value: string) => void;
  billingFilter: ModelBillingFilter;
  billingCounts: ModelBillingCounts;
  onBillingFilterChange: (value: ModelBillingFilter) => void;
  activeFilterCount: number;
  t: TranslateFunction;
};

/** The chip groups, shown inline on a mouse and inside a sheet on touch. */
export type ModelCostFilterChipsProps = {
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter;
  counts: ModelCostSourceCounts;
  totalCount: number;
  onSourceFilterChange: (value: ModelPricingSource | ModelPricingSourceFilter) => void;
  billingFilter: ModelBillingFilter;
  billingCounts: ModelBillingCounts;
  onBillingFilterChange: (value: ModelBillingFilter) => void;
  t: TranslateFunction;
};

export type ModelCostFilterSheetProps = ModelCostFilterChipsProps & {
  activeFilterCount: number;
};

export type ModelCostAttentionBannerProps = {
  fallbackCount: number;
  unpricedCount: number;
  t: TranslateFunction;
};

export type ModelCostTableProps = {
  rows: ModelCostCatalogRow[];
  onEdit: (row: ModelCostCatalogRow) => void;
  resolveBilling: (row: ModelCostCatalogRow) => ModelBillingInfo;
  t: TranslateFunction;
};

export type ModelCostSourceBadgeProps = {
  source: ModelPricingSource;
  t: TranslateFunction;
};

export type ModelCostEditFormProps = {
  row: ModelCostCatalogRow;
  isSubmitting: boolean;
  submitError: Error | null;
  onCancel: () => void;
  onSubmit: (request: PublishModelCostRequest) => void;
  t: TranslateFunction;
};

export type ModelCostEditDialogProps = {
  open: boolean;
  row: ModelCostCatalogRow | null;
  isSubmitting: boolean;
  submitError: Error | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: PublishModelCostRequest) => void;
  t: TranslateFunction;
};
