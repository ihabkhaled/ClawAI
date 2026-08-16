import { RoutingLabConfigurationVariant } from '../../../../common/enums';
import type { RouterConfigurationSnapshot } from '../../types/router-chain-resolution.types';
import {
  ROUTING_LAB_DEFAULT_SNAPSHOT,
  ROUTING_LAB_TRIGGER_GATED_SNAPSHOT,
} from '../constants/routing-lab-fixture-chain.constants';

/**
 * Resolves the `RouterConfigurationSnapshot` (or null) one
 * `RoutingLabConfigurationVariant` decides against.
 *
 * Every variant besides `DEFAULT` exists to reach exactly one
 * `CloudRouterManager` decline path, or chain shape, the healthy fixture
 * cannot reach on its own — mirrors `RouterConfigurationRepository
 * .findPublishedSnapshot`'s null-or-snapshot contract so the runner can hand
 * this straight to the fake repository.
 */
export function resolveRoutingLabSnapshot(
  variant: RoutingLabConfigurationVariant,
): RouterConfigurationSnapshot | null {
  switch (variant) {
    case RoutingLabConfigurationVariant.NO_PUBLISHED_CONFIGURATION:
      return null;

    case RoutingLabConfigurationVariant.CONFIGURATION_DISABLED:
      return { ...ROUTING_LAB_DEFAULT_SNAPSHOT, enabled: false };

    case RoutingLabConfigurationVariant.ALL_ENTRIES_UNRESOLVED:
      return {
        ...ROUTING_LAB_DEFAULT_SNAPSHOT,
        entries: ROUTING_LAB_DEFAULT_SNAPSHOT.entries.map((entry) => ({
          ...entry,
          deploymentId: null,
          deploymentProviderModelId: null,
          deploymentActivationState: null,
        })),
      };

    // Negative, not zero: the deadline must already be in the past by the
    // time the walk's first `now()` check runs, regardless of clock
    // granularity between computing it and checking it.
    case RoutingLabConfigurationVariant.SHORT_DEADLINE:
      return { ...ROUTING_LAB_DEFAULT_SNAPSHOT, totalDeadlineMs: -1_000 };

    // Lower than the chain's runnable entry count, so the walk stops early.
    case RoutingLabConfigurationVariant.LOW_MAX_ATTEMPTS:
      return { ...ROUTING_LAB_DEFAULT_SNAPSHOT, maxAttempts: 1 };

    case RoutingLabConfigurationVariant.TRIGGER_GATED_FALLBACK:
      return ROUTING_LAB_TRIGGER_GATED_SNAPSHOT;

    case RoutingLabConfigurationVariant.DEFAULT:
      return ROUTING_LAB_DEFAULT_SNAPSHOT;

    default:
      return ROUTING_LAB_DEFAULT_SNAPSHOT;
  }
}
