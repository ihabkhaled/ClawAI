import { type ProviderBreakerReason } from '../enums/provider-breaker-reason.enum';
import { type ProviderBreakerSource } from '../enums/provider-breaker-source.enum';

/** The JSON value stored under the Redis state key (the probe is its own key). */
export type StoredProviderBreakerState = {
  openUntil: number;
  reason: ProviderBreakerReason;
  trippedAt: number;
};

/** One provider's in-memory breaker. `probeAt` set = a half-open probe is in flight. */
export type ProviderBreakerState = StoredProviderBreakerState & {
  probeAt: number | null;
};

/** One row of the shared breaker as the Redis store reads it back. */
export type StoredProviderBreakerEntry = StoredProviderBreakerState & {
  provider: string;
  probing: boolean;
};

/** One skipped provider, as the admin endpoint returns it. */
export type SkippedProviderView = {
  provider: string;
  reason: ProviderBreakerReason;
  /** ISO time the skip window ends; after it one call probes (half-open). */
  skippedUntil: string;
  trippedAt: string;
  /** True while a half-open probe is in flight somewhere. */
  probing: boolean;
};

/** GET /chat-messages/admin/provider-breakers. */
export type SkippedProvidersResponse = {
  source: ProviderBreakerSource;
  providers: SkippedProviderView[];
};

/** DELETE /chat-messages/admin/provider-breakers/:provider. */
export type ClearProviderBreakerResponse = {
  provider: string;
  cleared: boolean;
};
