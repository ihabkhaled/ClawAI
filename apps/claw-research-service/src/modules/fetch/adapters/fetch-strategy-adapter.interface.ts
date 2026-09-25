import type { FetchStrategyKind } from '../../../generated/prisma';
import type { FetchAdapter } from './fetch-adapter.interface';

/**
 * A `FetchAdapter` that self-identifies its `FetchStrategyKind`, so
 * `FetchStrategyRegistryService` can build its `kind -> adapter` map without
 * a switch statement. See `skills/add-a-fetch-strategy.md`.
 *
 * An adapter returns a `FetchResult` and never decides whether it was
 * blocked — `classifyBlockSignal` does that, identically for every tier.
 */
export interface FetchStrategyAdapter extends FetchAdapter {
  readonly kind: FetchStrategyKind;
  /**
   * Optional applicability test. When present and false for a URL, the
   * strategy is skipped without counting as an attempt (the official-API
   * strategy only knows a handful of hosts).
   */
  supports?(url: string): boolean;
}
