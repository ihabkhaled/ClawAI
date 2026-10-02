import type {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';

import type { Connector } from './connector.types';
import type { TranslateFunction } from './i18n.types';

/** The connector fields the billing roll-up reads. */
export type CreditPolicyConnector = {
  id: Connector['id'];
  provider: Connector['provider'];
  isEnabled: Connector['isEnabled'];
  isPayAsYouGo?: Connector['isPayAsYouGo'];
};

/** One provider's rolled-up answer, plus the connector an admin edits to change it. */
export type ProviderCreditPolicyEntry = {
  isCredit: boolean;
  connectorId: string;
};

/** Keyed by the UPPER-CASE provider, mirroring connector-service rollUpPaygPolicy. */
export type ProviderCreditPolicy = ReadonlyMap<string, ProviderCreditPolicyEntry>;

export type ModelBillingInfo = {
  mode: ModelBillingMode;
  source: ModelBillingSource;
  // The connector whose switch decides it; null when no connector exists.
  connectorId: string | null;
};

export type ModelBillingCounts = Record<ModelBillingMode, number>;

export type UseProviderCreditPolicyResult = {
  policy: ProviderCreditPolicy;
  isLoading: boolean;
  isError: boolean;
};

export type ModelBillingBadgeProps = {
  billing: ModelBillingInfo;
  t: TranslateFunction;
};

export type ModelBillingCellProps = {
  billing: ModelBillingInfo;
  provider: string;
  t: TranslateFunction;
};

export type ModelBillingFilterChipsProps = {
  value: ModelBillingFilter;
  counts: ModelBillingCounts;
  totalCount: number;
  onChange: (value: ModelBillingFilter) => void;
  t: TranslateFunction;
};

export type ModelBillingHelpProps = {
  isPolicyError: boolean;
  t: TranslateFunction;
};
