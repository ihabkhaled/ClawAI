import { ProviderBreakerReason } from '@/enums/provider-breaker-reason.enum';
import type { Connector } from '@/types/connector.types';
import type { TranslateFunction } from '@/types/i18n.types';
import type { SkippedProvider, SkippedProviderRow } from '@/types/provider-breaker.types';

import { formatDateTimeSafe } from './date.utility';

function reasonLabel(reason: ProviderBreakerReason, t: TranslateFunction): string {
  if (reason === ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED) {
    return t('skippedProviders.reasons.accountCreditExhausted');
  }
  return reason;
}

/**
 * The skipped-provider rows the connectors page renders. The breaker is keyed
 * by PROVIDER (one account per provider key), so the connector names come
 * from the admin's own connector list: every connector of that provider.
 */
export function buildSkippedProviderRows(
  providers: readonly SkippedProvider[],
  connectors: readonly Connector[],
  t: TranslateFunction,
): SkippedProviderRow[] {
  return providers.map((entry) => {
    const names = connectors
      .filter((connector) => connector.provider === entry.provider)
      .map((connector) => connector.name);
    return {
      provider: entry.provider,
      connectorLabel: names.length > 0 ? names.join(', ') : t('skippedProviders.noConnector'),
      reasonLabel: reasonLabel(entry.reason, t),
      skippedUntilLabel: formatDateTimeSafe(entry.skippedUntil),
      probing: entry.probing,
    };
  });
}
