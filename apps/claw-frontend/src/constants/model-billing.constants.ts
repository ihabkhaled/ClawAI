import { STATUS_STYLES } from '@/constants/status-badge.constants';
import {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';

// Mirrors connector-service list-connectors-query.dto.ts `limit.max(100)`.
export const CONNECTOR_LIST_MAX_PAGE_SIZE = 100;

// Upper bound on pages fetched for the billing roll-up (10 x 100 connectors).
// A bound, never an open loop: a wrong totalPages must not flood the API.
export const CREDIT_POLICY_MAX_PAGES = 10;

// The query-key filter that keeps the full credit-policy listing apart from
// the connectors page's own first-page query, while still being invalidated
// by every `queryKeys.connectors.lists()` mutation.
export const CREDIT_POLICY_QUERY_FILTERS: Readonly<Record<string, unknown>> = Object.freeze({
  scope: 'credit-policy',
  limit: CONNECTOR_LIST_MAX_PAGE_SIZE,
});

export const MODEL_BILLING_LABEL_KEYS: Record<ModelBillingMode, string> = {
  [ModelBillingMode.CREDIT]: 'adminModelCosts.billing.credit',
  [ModelBillingMode.INCLUDED]: 'adminModelCosts.billing.included',
};

export const MODEL_BILLING_BADGE_CLASSES: Record<ModelBillingMode, string> = {
  [ModelBillingMode.CREDIT]: STATUS_STYLES['pending'] ?? '',
  [ModelBillingMode.INCLUDED]: STATUS_STYLES['inactive'] ?? '',
};

export const MODEL_BILLING_SOURCE_HINT_KEYS: Record<ModelBillingSource, string> = {
  [ModelBillingSource.CONNECTOR]: 'adminModelCosts.billing.sourceConnector',
  [ModelBillingSource.PROVIDER_DEFAULT]: 'adminModelCosts.billing.sourceDefault',
  [ModelBillingSource.LOCAL_EXEMPT]: 'adminModelCosts.billing.sourceLocal',
};

export const MODEL_BILLING_FILTER_OPTIONS: ReadonlyArray<ModelBillingFilter> = [
  ModelBillingFilter.ALL,
  ModelBillingFilter.CREDIT,
  ModelBillingFilter.INCLUDED,
];

export const MODEL_BILLING_FILTER_LABEL_KEYS: Record<ModelBillingFilter, string> = {
  [ModelBillingFilter.ALL]: 'adminModelCosts.filters.all',
  [ModelBillingFilter.CREDIT]: 'adminModelCosts.billing.credit',
  [ModelBillingFilter.INCLUDED]: 'adminModelCosts.billing.included',
};
