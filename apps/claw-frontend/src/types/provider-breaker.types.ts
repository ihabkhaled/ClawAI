import type { ProviderBreakerReason } from '@/enums/provider-breaker-reason.enum';
import type { ProviderBreakerSource } from '@/enums/provider-breaker-source.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** One provider chat-service is skipping (GET /chat-messages/admin/provider-breakers). */
export type SkippedProvider = {
  provider: string;
  reason: ProviderBreakerReason;
  skippedUntil: string;
  trippedAt: string;
  probing: boolean;
};

export type SkippedProvidersResponse = {
  source: ProviderBreakerSource;
  providers: SkippedProvider[];
};

/** DELETE /chat-messages/admin/provider-breakers/:provider. */
export type ClearProviderBreakerResponse = {
  provider: string;
  cleared: boolean;
};

/** One rendered row: the provider joined to the admin's connectors that use it. */
export type SkippedProviderRow = {
  provider: string;
  connectorLabel: string;
  reasonLabel: string;
  skippedUntilLabel: string;
  probing: boolean;
};

export type SkippedProvidersCardProps = {
  rows: readonly SkippedProviderRow[];
  isLoading: boolean;
  isError: boolean;
  isPartial: boolean;
  clearingProvider: string | null;
  onClear: (provider: string) => void;
  t: TranslateFunction;
};

export type UseSkippedProvidersReturn = {
  /** False for anyone but an ADMIN: the section is not rendered and nothing is fetched. */
  isVisible: boolean;
  rows: SkippedProviderRow[];
  isLoading: boolean;
  isError: boolean;
  isPartial: boolean;
  clearingProvider: string | null;
  clear: (provider: string) => void;
};
