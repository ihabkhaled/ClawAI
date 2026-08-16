import { RoutingLabConfigurationVariant } from '../../../../common/enums';
import { resolveRoutingLabSnapshot } from '../utilities/routing-lab-configuration-variant.utility';

describe('resolveRoutingLabSnapshot', () => {
  it('returns the healthy 7-entry chain for DEFAULT', () => {
    const snapshot = resolveRoutingLabSnapshot(RoutingLabConfigurationVariant.DEFAULT);
    expect(snapshot?.enabled).toBe(true);
    expect(snapshot?.entries).toHaveLength(7);
    expect(snapshot?.entries.every((entry) => entry.deploymentId !== null)).toBe(true);
  });

  it('returns null for NO_PUBLISHED_CONFIGURATION', () => {
    expect(
      resolveRoutingLabSnapshot(RoutingLabConfigurationVariant.NO_PUBLISHED_CONFIGURATION),
    ).toBeNull();
  });

  it('returns enabled:false for CONFIGURATION_DISABLED, chain otherwise intact', () => {
    const snapshot = resolveRoutingLabSnapshot(
      RoutingLabConfigurationVariant.CONFIGURATION_DISABLED,
    );
    expect(snapshot?.enabled).toBe(false);
    expect(snapshot?.entries).toHaveLength(7);
  });

  it('unresolves every entry for ALL_ENTRIES_UNRESOLVED', () => {
    const snapshot = resolveRoutingLabSnapshot(
      RoutingLabConfigurationVariant.ALL_ENTRIES_UNRESOLVED,
    );
    expect(snapshot?.entries.every((entry) => entry.deploymentId === null)).toBe(true);
    expect(snapshot?.entries.every((entry) => entry.deploymentProviderModelId === null)).toBe(true);
  });

  it('gives SHORT_DEADLINE a totalDeadlineMs already in the past', () => {
    const snapshot = resolveRoutingLabSnapshot(RoutingLabConfigurationVariant.SHORT_DEADLINE);
    expect(snapshot?.totalDeadlineMs).toBeLessThan(0);
  });

  it('gives LOW_MAX_ATTEMPTS a ceiling below the runnable entry count', () => {
    const snapshot = resolveRoutingLabSnapshot(RoutingLabConfigurationVariant.LOW_MAX_ATTEMPTS);
    expect(snapshot?.maxAttempts).toBe(1);
  });

  it('gives TRIGGER_GATED_FALLBACK a minimal 2-entry chain with a gated second entry', () => {
    const snapshot = resolveRoutingLabSnapshot(
      RoutingLabConfigurationVariant.TRIGGER_GATED_FALLBACK,
    );
    expect(snapshot?.entries).toHaveLength(2);
    expect(snapshot?.entries[1]?.triggers).toContain('MALFORMED_STRUCTURED_OUTPUT');
    expect(snapshot?.entries[0]?.triggers).toHaveLength(0);
  });
});
