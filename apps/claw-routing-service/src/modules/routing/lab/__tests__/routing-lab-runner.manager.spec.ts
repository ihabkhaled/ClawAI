import {
  RouterErrorCode,
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
  RoutingLabPromptLengthBucket,
} from '../../../../common/enums';
import { DomainTag, PrivacyClass, RouterProvider } from '../../../../generated/prisma';
import { RoutingLabRunnerManager } from '../managers/routing-lab-runner.manager';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';

const baseCase = (overrides: Partial<RoutingLabCase> = {}): RoutingLabCase => ({
  id: 'case-manual',
  category: RoutingLabCaseCategory.EDGE_CASE,
  description: 'manual case',
  configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
  privacyClass: PrivacyClass.CLOUD_PERMITTED,
  domain: DomainTag.GENERAL,
  lengthBucket: RoutingLabPromptLengthBucket.SHORT,
  prompt: 'route this',
  eligibleDeploymentIds: [
    'lab_dep_gemini_primary',
    'lab_dep_gemini_fallback',
    'lab_dep_ollama_cloud_glm',
  ],
  faultPlan: {},
  ...overrides,
});

describe('RoutingLabRunnerManager.runCase', () => {
  let runner: RoutingLabRunnerManager;

  beforeEach(() => {
    runner = new RoutingLabRunnerManager();
  });

  it('passes an unfaulted case through the primary Gemini entry', async () => {
    const outcome = await runner.runCase(baseCase());

    expect(outcome.available).toBe(true);
    expect(outcome.passed).toBe(true);
    expect(outcome.fallbackDepth).toBe(0);
    expect(outcome.selectedDeploymentId).toBe('lab_dep_gemini_primary');
  });

  it('declines a request-scope hard stop rather than trying the next entry', async () => {
    const outcome = await runner.runCase(
      baseCase({
        id: 'case-cancelled',
        faultPlan: {
          [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.CANCELLED }],
        },
      }),
    );

    expect(outcome.available).toBe(true);
    expect(outcome.passed).toBe(false);
    expect(outcome.finalErrorCode).toBe(RouterErrorCode.CANCELLED);
  });

  it('declines NO_ELIGIBLE_EXECUTION_MODEL when nothing is eligible', async () => {
    const outcome = await runner.runCase(baseCase({ id: 'case-empty', eligibleDeploymentIds: [] }));

    expect(outcome.available).toBe(false);
    expect(outcome.unavailableReason).toBe('NO_ELIGIBLE_EXECUTION_MODEL');
  });

  it('declines NO_PUBLISHED_CONFIGURATION for that configuration variant', async () => {
    const outcome = await runner.runCase(
      baseCase({
        id: 'case-no-config',
        configurationVariant: RoutingLabConfigurationVariant.NO_PUBLISHED_CONFIGURATION,
      }),
    );

    expect(outcome.available).toBe(false);
    expect(outcome.unavailableReason).toBe('NO_PUBLISHED_CONFIGURATION');
  });

  it('falls back to Ollama Cloud when Gemini fails provider-wide', async () => {
    const outcome = await runner.runCase(
      baseCase({
        id: 'case-provider-fallback',
        faultPlan: {
          [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.PROVIDER_5XX }],
        },
      }),
    );

    expect(outcome.passed).toBe(true);
    expect(outcome.selectedDeploymentId).toBe('lab_dep_ollama_cloud_glm');
    expect(outcome.fallbackDepth).toBeGreaterThan(0);
  });
});

describe('RoutingLabRunnerManager.runCorpus', () => {
  it('runs every case and stamps a generation timestamp', async () => {
    const runner = new RoutingLabRunnerManager();
    const cases = [baseCase({ id: 'a' }), baseCase({ id: 'b' })];

    const result = await runner.runCorpus(cases);

    expect(result.totalCases).toBe(2);
    expect(result.outcomes).toHaveLength(2);
    expect(result.outcomes.map((o) => o.caseId)).toEqual(['a', 'b']);
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });
});
