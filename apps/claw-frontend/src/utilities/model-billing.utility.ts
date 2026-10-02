import { PAYG_EXEMPT_PROVIDERS } from '@claw/shared-constants';

import {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';
import type {
  CreditPolicyConnector,
  ModelBillingCounts,
  ModelBillingInfo,
  ProviderCreditPolicy,
  ProviderCreditPolicyEntry,
} from '@/types/model-billing.types';

import { defaultCreditConnectorForProvider } from './connector-credit.utility';

/**
 * Whether a model is a CREDIT model, decided exactly the way billing decides it.
 *
 * Billing is provider-grained, not model-grained (ADR-082). auth-service's
 * `isMeteredProvider` answers: a local provider (PAYG_EXEMPT_PROVIDERS) is never
 * metered; otherwise the connector policy map rolled up by connector-service's
 * `rollUpPaygPolicy` decides; a provider missing from that map falls back to
 * PAYG_DEFAULT_PROVIDERS. Every function here mirrors one of those three steps,
 * so the admin badge cannot disagree with what the wallet is charged. There is
 * deliberately no per-model flag: billing would ignore it.
 */
export function normalizeBillingProvider(provider: string): string {
  return provider.trim().toUpperCase();
}

export function isLocalExemptProvider(provider: string): boolean {
  const normalized = normalizeBillingProvider(provider);
  return PAYG_EXEMPT_PROVIDERS.some((exempt) => exempt.toUpperCase() === normalized);
}

/**
 * Mirrors `rollUpPaygPolicy`: a provider is credit when ANY enabled connector
 * for it has `isPayAsYouGo`. A disabled one still registers its provider, as an
 * explicit "included", so it does not fall through to the provider default.
 * The remembered connector is the one that made it credit, else the first seen.
 */
export function buildProviderCreditPolicy(
  connectors: readonly CreditPolicyConnector[],
): ProviderCreditPolicy {
  const policy = new Map<string, ProviderCreditPolicyEntry>();
  for (const connector of connectors) {
    const key = normalizeBillingProvider(connector.provider);
    const previous = policy.get(key);
    const contributes = connector.isEnabled && connector.isPayAsYouGo === true;
    const wasCredit = previous?.isCredit ?? false;
    policy.set(key, {
      isCredit: wasCredit || contributes,
      connectorId:
        contributes && !wasCredit ? connector.id : (previous?.connectorId ?? connector.id),
    });
  }
  return policy;
}

export function resolveModelBilling(
  provider: string,
  policy: ProviderCreditPolicy,
): ModelBillingInfo {
  const entry = policy.get(normalizeBillingProvider(provider));
  if (isLocalExemptProvider(provider)) {
    return {
      mode: ModelBillingMode.INCLUDED,
      source: ModelBillingSource.LOCAL_EXEMPT,
      connectorId: entry?.connectorId ?? null,
    };
  }
  if (entry !== undefined) {
    return {
      mode: entry.isCredit ? ModelBillingMode.CREDIT : ModelBillingMode.INCLUDED,
      source: ModelBillingSource.CONNECTOR,
      connectorId: entry.connectorId,
    };
  }
  return {
    mode: defaultCreditConnectorForProvider(provider)
      ? ModelBillingMode.CREDIT
      : ModelBillingMode.INCLUDED,
    source: ModelBillingSource.PROVIDER_DEFAULT,
    connectorId: null,
  };
}

export function matchesModelBillingFilter(
  mode: ModelBillingMode,
  filter: ModelBillingFilter,
): boolean {
  if (filter === ModelBillingFilter.ALL) {
    return true;
  }
  return filter === ModelBillingFilter.CREDIT
    ? mode === ModelBillingMode.CREDIT
    : mode === ModelBillingMode.INCLUDED;
}

export function countModelsByBilling<T extends { provider: string }>(
  rows: readonly T[],
  policy: ProviderCreditPolicy,
): ModelBillingCounts {
  const counts: ModelBillingCounts = {
    [ModelBillingMode.CREDIT]: 0,
    [ModelBillingMode.INCLUDED]: 0,
  };
  for (const row of rows) {
    const { mode } = resolveModelBilling(row.provider, policy);
    counts[mode] += 1;
  }
  return counts;
}

/** The number a billing chip shows; ALL carries the whole list's size. */
export function resolveModelBillingFilterCount(
  option: ModelBillingFilter,
  counts: ModelBillingCounts,
  totalCount: number,
): number {
  if (option === ModelBillingFilter.ALL) {
    return totalCount;
  }
  return option === ModelBillingFilter.CREDIT
    ? counts[ModelBillingMode.CREDIT]
    : counts[ModelBillingMode.INCLUDED];
}

export function filterRowsByBilling<T extends { provider: string }>(
  rows: readonly T[],
  filter: ModelBillingFilter,
  policy: ProviderCreditPolicy,
): T[] {
  if (filter === ModelBillingFilter.ALL) {
    return [...rows];
  }
  return rows.filter((row) =>
    matchesModelBillingFilter(resolveModelBilling(row.provider, policy).mode, filter),
  );
}
