import { type Mock, vi } from 'vitest';
import { ModelCostClass, PaygSurface } from '@claw/shared-types';

import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { type ConnectorPolicyClient } from '../../clients/connector-policy.client';
import { type CreditFreeAllowanceRepository } from '../../repositories/credit-free-allowance.repository';
import { type CreditReserveInput, type PaygRateSnapshot } from '../../types/credit.types';
import { CreditFreeAllowanceService } from '../credit-free-allowance.service';

// $1 per million input tokens, $10 per million output tokens.
const RATE: PaygRateSnapshot = {
  rates: {
    provider: 'GROK',
    model: 'grok-4',
    version: 1,
    currency: 'USD',
    inputPerMillionMicroUsd: 1_000_000,
    outputPerMillionMicroUsd: 10_000_000,
    cachedInputPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: null,
    costClass: ModelCostClass.STANDARD,
    isAdminOverride: false,
    effectiveFrom: '2026-08-29T00:00:00.000Z',
    lastVerifiedAt: null,
    source: 'SEED',
  },
  isPriced: true,
  isLocalComputeFallback: false,
};

const makeInput = (overrides: Partial<CreditReserveInput> = {}): CreditReserveInput => ({
  userId: 'user-1',
  requestId: 'req-1',
  provider: 'grok',
  model: 'grok-4',
  surface: PaygSurface.CHAT,
  workflow: null,
  promptTokens: 1000,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: 30_512,
  ...overrides,
});

const NOW = new Date('2026-10-15T12:00:00.000Z');

const makePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'plan-free',
  slug: 'free',
  creditConnectorFreeRequestsPerMonth: 2,
  monthlyProviderCostCeilingMicroUsd: 300_000n,
  ...overrides,
});

describe('CreditFreeAllowanceService', () => {
  let plans: { findEffectiveForUser: Mock; findDefault: Mock };
  let counters: { tryConsume: Mock; giveBack: Mock; findForUserPeriod: Mock };
  let policy: { getPolicy: Mock };
  let service: CreditFreeAllowanceService;

  beforeEach(() => {
    plans = {
      findEffectiveForUser: vi.fn().mockResolvedValue(makePlan()),
      findDefault: vi.fn().mockResolvedValue(null),
    };
    counters = {
      tryConsume: vi.fn().mockResolvedValue(true),
      giveBack: vi.fn().mockResolvedValue(undefined),
      findForUserPeriod: vi.fn().mockResolvedValue([]),
    };
    policy = { getPolicy: vi.fn().mockResolvedValue({ GROK: true, OPENAI: true, OLLAMA: false }) };
    service = new CreditFreeAllowanceService(
      plans as unknown as PlansRepository,
      counters as unknown as CreditFreeAllowanceRepository,
      policy as unknown as ConnectorPolicyClient,
    );
  });

  describe('resolvePolicy', () => {
    it('returns the plan allowance and the per-request ceiling', async () => {
      await expect(service.resolvePolicy('user-1')).resolves.toEqual({
        limit: 2,
        requestCeilingMicroUsd: 150_000n,
      });
    });

    it('0 means disabled: no policy at all', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: 0 }),
      );
      await expect(service.resolvePolicy('user-1')).resolves.toBeNull();
    });

    it('null means unlimited: a policy with a null limit', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      await expect(service.resolvePolicy('user-1')).resolves.toMatchObject({ limit: null });
    });

    it('falls back to the default plan when the user has no assignment', async () => {
      plans.findEffectiveForUser.mockResolvedValue(null);
      plans.findDefault.mockResolvedValue(makePlan({ creditConnectorFreeRequestsPerMonth: 5 }));
      await expect(service.resolvePolicy('user-1')).resolves.toMatchObject({ limit: 5 });
    });

    it('is null when there is no plan at all', async () => {
      plans.findEffectiveForUser.mockResolvedValue(null);
      await expect(service.resolvePolicy('user-1')).resolves.toBeNull();
    });
  });

  describe('tryAdmit', () => {
    it('counts against the upper-cased provider and the UTC month', async () => {
      const admission = await service.tryAdmit(makeInput(), RATE, NOW);

      expect(counters.tryConsume).toHaveBeenCalledWith(
        { userId: 'user-1', provider: 'GROK', periodKey: '2026-10' },
        2,
      );
      expect(admission?.counter).toEqual({
        userId: 'user-1',
        provider: 'GROK',
        periodKey: '2026-10',
      });
    });

    it('clamps the output so the worst case stays inside the per-request ceiling', async () => {
      const admission = await service.tryAdmit(makeInput(), RATE, NOW);

      // $0.15 ceiling minus a $0.001 prompt, at $10 per million output tokens.
      expect(admission?.maxOutputTokens).toBe(14_900);
      expect(admission?.clamped).toBe(true);
      expect(admission?.worstCaseCostMicroUsd).toBeLessThanOrEqual(150_000n);
    });

    it('does not report a clamp when the request already fits', async () => {
      const admission = await service.tryAdmit(
        makeInput({ requestedMaxOutputTokens: 500 }),
        RATE,
        NOW,
      );
      expect(admission).toMatchObject({ maxOutputTokens: 500, clamped: false });
    });

    it.each([PaygSurface.IMAGE, PaygSurface.VIDEO, PaygSurface.TRANSCRIPTION, PaygSurface.TTS])(
      'refuses the per-unit surface %s without touching the counter',
      async (surface) => {
        await expect(service.tryAdmit(makeInput({ surface }), RATE, NOW)).resolves.toBeNull();
        expect(counters.tryConsume).not.toHaveBeenCalled();
      },
    );

    it('refuses a unit-carrying call mislabelled as chat', async () => {
      await expect(service.tryAdmit(makeInput({ videoSeconds: 8 }), RATE, NOW)).resolves.toBeNull();
      expect(counters.tryConsume).not.toHaveBeenCalled();
    });

    it('refuses when the plan gives none (0) and never reads the counter', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: 0 }),
      );
      await expect(service.tryAdmit(makeInput(), RATE, NOW)).resolves.toBeNull();
      expect(counters.tryConsume).not.toHaveBeenCalled();
    });

    it('admits with the INT4 stand-in limit when the plan is unlimited (null)', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      await service.tryAdmit(makeInput(), RATE, NOW);
      expect(counters.tryConsume).toHaveBeenCalledWith(expect.anything(), 2_147_483_647);
    });

    it('refuses a prompt the per-request ceiling cannot pay for, without burning a slot', async () => {
      // 2M prompt tokens is $2.00, far above the $0.15 ceiling.
      await expect(
        service.tryAdmit(makeInput({ promptTokens: 2_000_000 }), RATE, NOW),
      ).resolves.toBeNull();
      expect(counters.tryConsume).not.toHaveBeenCalled();
    });

    it('refuses when the counter says the allowance is spent', async () => {
      counters.tryConsume.mockResolvedValue(false);
      await expect(service.tryAdmit(makeInput(), RATE, NOW)).resolves.toBeNull();
    });

    it('keeps providers and months apart: the key carries both', async () => {
      await service.tryAdmit(
        makeInput({ provider: 'GROK' }),
        RATE,
        new Date('2026-10-31T23:59:59Z'),
      );
      await service.tryAdmit(
        makeInput({ provider: 'OPENAI' }),
        RATE,
        new Date('2026-11-01T00:00:00Z'),
      );

      expect(counters.tryConsume.mock.calls.map(([key]) => key)).toEqual([
        { userId: 'user-1', provider: 'GROK', periodKey: '2026-10' },
        { userId: 'user-1', provider: 'OPENAI', periodKey: '2026-11' },
      ]);
    });
  });

  describe('giveBack', () => {
    it('returns the slot on the normalised key', async () => {
      await service.giveBack({ userId: 'user-1', provider: ' grok', periodKey: '2026-10' });

      expect(counters.giveBack).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: 'GROK',
        periodKey: '2026-10',
      });
    });
  });

  describe('getViews', () => {
    it('lists every metered provider with the remaining count', async () => {
      counters.findForUserPeriod.mockResolvedValue([{ provider: 'GROK', usedCount: 1 }]);

      await expect(service.getViews('user-1', NOW)).resolves.toEqual([
        { provider: 'GROK', limit: 2, used: 1, remaining: 1 },
        { provider: 'OPENAI', limit: 2, used: 0, remaining: 2 },
      ]);
      expect(counters.findForUserPeriod).toHaveBeenCalledWith('user-1', '2026-10');
    });

    it('omits a provider the policy does not meter', async () => {
      const views = await service.getViews('user-1', NOW);
      expect(views.map((view) => view.provider)).not.toContain('OLLAMA');
    });

    it('is empty when the plan gives none', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: 0 }),
      );
      await expect(service.getViews('user-1', NOW)).resolves.toEqual([]);
      expect(policy.getPolicy).not.toHaveBeenCalled();
    });

    it('reports a null limit and null remaining for an unlimited plan', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      const [first] = await service.getViews('user-1', NOW);
      expect(first).toMatchObject({ limit: null, remaining: null });
    });
  });
});
