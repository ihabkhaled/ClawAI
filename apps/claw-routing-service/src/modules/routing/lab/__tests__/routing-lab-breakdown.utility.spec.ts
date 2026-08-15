import { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';
import { DomainTag, PrivacyClass } from '../../../../generated/prisma';
import type { RoutingLabCaseOutcome, RoutingLabRunResult } from '../types/routing-lab-run.types';
import { computeRoutingLabManifestData } from '../utilities/routing-lab-breakdown.utility';

const outcome = (overrides: Partial<RoutingLabCaseOutcome>): RoutingLabCaseOutcome => ({
  caseId: 'c',
  category: RoutingLabCaseCategory.BASELINE,
  description: 'd',
  domain: DomainTag.GENERAL,
  privacyClass: PrivacyClass.CLOUD_PERMITTED,
  available: true,
  passed: true,
  unavailableReason: null,
  finalErrorCode: null,
  fallbackDepth: 0,
  attemptCount: 1,
  attemptCodes: [null],
  quarantinedDeploymentIds: [],
  selectedDeploymentId: 'dep',
  ...overrides,
});

describe('computeRoutingLabManifestData', () => {
  it('counts passed and declined-unavailable outcomes, grouped by reason', () => {
    const runResult: RoutingLabRunResult = {
      totalCases: 3,
      generatedAt: '2026-01-01T00:00:00.000Z',
      outcomes: [
        outcome({ passed: true }),
        outcome({
          passed: false,
          available: false,
          unavailableReason: 'NO_PUBLISHED_CONFIGURATION',
          fallbackDepth: null,
          attemptCount: 0,
          attemptCodes: [],
        }),
        outcome({
          passed: false,
          available: false,
          unavailableReason: 'NO_PUBLISHED_CONFIGURATION',
          fallbackDepth: null,
          attemptCount: 0,
          attemptCodes: [],
        }),
      ],
    };

    const data = computeRoutingLabManifestData(runResult);

    expect(data.passDecline.passed).toBe(1);
    expect(data.passDecline.declinedUnavailable).toBe(2);
    expect(data.passDecline.declinedByReason.NO_PUBLISHED_CONFIGURATION).toBe(2);
  });

  it('counts a chain-exhausted decline by its final error code', () => {
    const runResult: RoutingLabRunResult = {
      totalCases: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      outcomes: [
        outcome({
          passed: false,
          available: true,
          finalErrorCode: RouterErrorCode.PROVIDER_5XX,
          fallbackDepth: null,
          attemptCount: 2,
          attemptCodes: [RouterErrorCode.PROVIDER_5XX, RouterErrorCode.PROVIDER_5XX],
        }),
      ],
    };

    const data = computeRoutingLabManifestData(runResult);

    expect(data.passDecline.declinedChainExhausted).toBe(1);
    expect(data.passDecline.declinedByFinalErrorCode[RouterErrorCode.PROVIDER_5XX]).toBe(1);
  });

  it('builds a fallback-depth histogram with average and max over successes only', () => {
    const runResult: RoutingLabRunResult = {
      totalCases: 3,
      generatedAt: '2026-01-01T00:00:00.000Z',
      outcomes: [
        outcome({ fallbackDepth: 0 }),
        outcome({ fallbackDepth: 2 }),
        outcome({ fallbackDepth: 2 }),
      ],
    };

    const data = computeRoutingLabManifestData(runResult);

    expect(data.fallbackDepth.histogram).toEqual({ 0: 1, 2: 2 });
    expect(data.fallbackDepth.successCount).toBe(3);
    expect(data.fallbackDepth.maxDepth).toBe(2);
    expect(data.fallbackDepth.averageDepth).toBeCloseTo((0 + 2 + 2) / 3, 5);
  });

  it('tallies every attempt code across the run, not just the final one', () => {
    const runResult: RoutingLabRunResult = {
      totalCases: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      outcomes: [
        outcome({
          passed: true,
          attemptCount: 2,
          attemptCodes: [RouterErrorCode.TIMEOUT, null],
        }),
      ],
    };

    const data = computeRoutingLabManifestData(runResult);

    expect(data.errorTaxonomy.counts[RouterErrorCode.TIMEOUT]).toBe(1);
    expect(data.errorTaxonomy.totalAttempts).toBe(2);
    expect(data.errorTaxonomy.totalFailedAttempts).toBe(1);
    expect(data.errorTaxonomy.distinctCodesObserved).toBe(1);
  });

  it('counts cases per category', () => {
    const runResult: RoutingLabRunResult = {
      totalCases: 2,
      generatedAt: '2026-01-01T00:00:00.000Z',
      outcomes: [
        outcome({ category: RoutingLabCaseCategory.BASELINE }),
        outcome({ category: RoutingLabCaseCategory.EDGE_CASE }),
      ],
    };

    const data = computeRoutingLabManifestData(runResult);

    expect(data.categoryCounts[RoutingLabCaseCategory.BASELINE]).toBe(1);
    expect(data.categoryCounts[RoutingLabCaseCategory.EDGE_CASE]).toBe(1);
  });
});
