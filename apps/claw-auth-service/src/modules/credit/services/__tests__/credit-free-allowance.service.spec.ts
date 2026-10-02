import { type Mock, vi } from 'vitest';
import { ModelCostClass, PaygSurface } from '@claw/shared-types';

import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { type CreditFreeAllowanceRepository } from '../../repositories/credit-free-allowance.repository';
import {
  type CreditFreeAllowancePolicy,
  type CreditReserveInput,
  type PaygRateSnapshot,
} from '../../types/credit.types';
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
  let counters: { tryConsume: Mock; giveBack: Mock; findTotalUsed: Mock };
  let service: CreditFreeAllowanceService;

  const policyOf = async (): Promise<CreditFreeAllowancePolicy> => {
    const policy = await service.resolvePolicy('user-1');
    if (policy === null) {
      throw new Error('expected a policy');
    }
    return policy;
  };

  beforeEach(() => {
    plans = {
      findEffectiveForUser: vi.fn().mockResolvedValue(makePlan()),
      findDefault: vi.fn().mockResolvedValue(null),
    };
    counters = {
      tryConsume: vi.fn().mockResolvedValue(true),
      giveBack: vi.fn().mockResolvedValue(undefined),
      findTotalUsed: vi.fn().mockResolvedValue(0),
    };
    service = new CreditFreeAllowanceService(
      plans as unknown as PlansRepository,
      counters as unknown as CreditFreeAllowanceRepository,
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
    it('counts on the ONE total key and the UTC month, whatever the provider', async () => {
      const attempt = await service.tryAdmit(makeInput(), RATE, await policyOf(), NOW);

      expect(counters.tryConsume).toHaveBeenCalledWith(
        { userId: 'user-1', provider: '*', periodKey: '2026-10' },
        2,
      );
      expect(attempt).toMatchObject({
        status: 'ADMITTED',
        admission: { counter: { userId: 'user-1', provider: '*', periodKey: '2026-10' } },
      });
    });

    it('clamps the output so the worst case stays inside the per-request ceiling', async () => {
      const attempt = await service.tryAdmit(makeInput(), RATE, await policyOf(), NOW);

      // $0.15 ceiling minus a $0.001 prompt, at $10 per million output tokens.
      expect(attempt).toMatchObject({
        status: 'ADMITTED',
        admission: { maxOutputTokens: 14_900, clamped: true },
      });
    });

    it('does not report a clamp when the request already fits', async () => {
      const attempt = await service.tryAdmit(
        makeInput({ requestedMaxOutputTokens: 500 }),
        RATE,
        await policyOf(),
        NOW,
      );
      expect(attempt).toMatchObject({
        status: 'ADMITTED',
        admission: { maxOutputTokens: 500, clamped: false },
      });
    });

    it('with no rate (metering off) only counts: the requested ceiling is kept, no clamp', async () => {
      const attempt = await service.tryAdmit(makeInput(), null, await policyOf(), NOW);
      expect(attempt).toMatchObject({
        status: 'ADMITTED',
        admission: { maxOutputTokens: 30_512, clamped: false, worstCaseCostMicroUsd: 0n },
      });
      expect(counters.tryConsume).toHaveBeenCalledTimes(1);
    });

    it.each([PaygSurface.IMAGE, PaygSurface.VIDEO, PaygSurface.TRANSCRIPTION, PaygSurface.TTS])(
      'is INELIGIBLE for the per-unit surface %s and never touches the counter',
      async (surface) => {
        await expect(
          service.tryAdmit(makeInput({ surface }), RATE, await policyOf(), NOW),
        ).resolves.toEqual({ status: 'INELIGIBLE' });
        expect(counters.tryConsume).not.toHaveBeenCalled();
      },
    );

    it('is INELIGIBLE for a unit-carrying call mislabelled as chat', async () => {
      await expect(
        service.tryAdmit(makeInput({ videoSeconds: 8 }), RATE, await policyOf(), NOW),
      ).resolves.toEqual({ status: 'INELIGIBLE' });
      expect(counters.tryConsume).not.toHaveBeenCalled();
    });

    it('admits with the INT4 stand-in limit when the plan is unlimited (null)', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      await service.tryAdmit(makeInput(), RATE, await policyOf(), NOW);
      expect(counters.tryConsume).toHaveBeenCalledWith(expect.anything(), 2_147_483_647);
    });

    it('says PROMPT_TOO_LARGE when the per-request ceiling cannot pay, without burning a slot', async () => {
      // 2M prompt tokens is $2.00, far above the $0.15 ceiling.
      await expect(
        service.tryAdmit(makeInput({ promptTokens: 2_000_000 }), RATE, await policyOf(), NOW),
      ).resolves.toEqual({ status: 'PROMPT_TOO_LARGE' });
      expect(counters.tryConsume).not.toHaveBeenCalled();
    });

    it('says SPENT, with the plan limit, when the counter refuses', async () => {
      counters.tryConsume.mockResolvedValue(false);
      await expect(service.tryAdmit(makeInput(), RATE, await policyOf(), NOW)).resolves.toEqual({
        status: 'SPENT',
        limit: 2,
      });
    });

    it('is one total across providers and a fresh total each UTC month', async () => {
      const policy = await policyOf();
      await service.tryAdmit(
        makeInput({ provider: 'GROK' }),
        RATE,
        policy,
        new Date('2026-10-31T23:59:59Z'),
      );
      await service.tryAdmit(
        makeInput({ provider: 'OPENAI' }),
        RATE,
        policy,
        new Date('2026-11-01T00:00:00Z'),
      );

      expect(counters.tryConsume.mock.calls.map(([key]) => key)).toEqual([
        { userId: 'user-1', provider: '*', periodKey: '2026-10' },
        { userId: 'user-1', provider: '*', periodKey: '2026-11' },
      ]);
    });

    describe.each([5, 15])('a plan that gives %i requests (atomic counter)', (limit) => {
      let used: number;

      beforeEach(() => {
        used = 0;
        plans.findEffectiveForUser.mockResolvedValue(
          makePlan({ creditConnectorFreeRequestsPerMonth: limit }),
        );
        // Same contract as the guarded upsert: take a slot only while below the limit.
        counters.tryConsume.mockImplementation(async (_key: unknown, max: number) => {
          if (used >= max) {
            return false;
          }
          used += 1;
          return true;
        });
        counters.giveBack.mockImplementation(async () => {
          used = Math.max(0, used - 1);
        });
      });

      it('admits exactly N requests and refuses N+1 across providers', async () => {
        const policy = await policyOf();
        const providers = ['ANTHROPIC', 'OPENAI', 'GROK'];
        const statuses: string[] = [];
        for (let i = 0; i < limit + 3; i += 1) {
          const attempt = await service.tryAdmit(
            makeInput({ provider: providers[i % providers.length] ?? 'GROK' }),
            RATE,
            policy,
            NOW,
          );
          statuses.push(attempt.status);
        }
        expect(statuses.slice(0, limit).every((status) => status === 'ADMITTED')).toBe(true);
        expect(statuses.slice(limit)).toEqual(['SPENT', 'SPENT', 'SPENT']);
      });

      it('a parallel burst of 3N admits exactly N', async () => {
        const policy = await policyOf();
        const attempts = await Promise.all(
          Array.from({ length: limit * 3 }, () => service.tryAdmit(makeInput(), RATE, policy, NOW)),
        );
        expect(attempts.filter((attempt) => attempt.status === 'ADMITTED')).toHaveLength(limit);
      });

      it('a slot given back (failed call) can be taken again', async () => {
        const policy = await policyOf();
        for (let i = 0; i < limit; i += 1) {
          await service.tryAdmit(makeInput(), RATE, policy, NOW);
        }
        await expect(service.tryAdmit(makeInput(), RATE, policy, NOW)).resolves.toMatchObject({
          status: 'SPENT',
        });
        await service.giveBack({ userId: 'user-1', provider: 'OPENAI', periodKey: '2026-10' });
        await expect(service.tryAdmit(makeInput(), RATE, policy, NOW)).resolves.toMatchObject({
          status: 'ADMITTED',
        });
      });
    });
  });

  describe('giveBack', () => {
    it('returns the slot to the total counter whatever provider the call used', async () => {
      await service.giveBack({ userId: 'user-1', provider: 'grok', periodKey: '2026-10' });

      expect(counters.giveBack).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: '*',
        periodKey: '2026-10',
      });
    });
  });

  describe('getView', () => {
    it('reports one total with remaining and the next UTC month start', async () => {
      counters.findTotalUsed.mockResolvedValue(1);

      await expect(service.getView('user-1', NOW, true)).resolves.toEqual({
        limit: 2,
        used: 1,
        remaining: 1,
        resetsAt: '2026-11-01T00:00:00.000Z',
      });
      expect(counters.findTotalUsed).toHaveBeenCalledWith('user-1', '2026-10');
    });

    it('is null when the plan gives none', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: 0 }),
      );
      await expect(service.getView('user-1', NOW, true)).resolves.toBeNull();
      expect(counters.findTotalUsed).not.toHaveBeenCalled();
    });

    it('reports a null limit and null remaining for an unlimited plan while metering is on', async () => {
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      await expect(service.getView('user-1', NOW, true)).resolves.toMatchObject({
        limit: null,
        remaining: null,
      });
    });

    it('with metering off shows a capped allowance (still enforced) but not an unlimited one', async () => {
      await expect(service.getView('user-1', NOW, false)).resolves.toMatchObject({ limit: 2 });
      plans.findEffectiveForUser.mockResolvedValue(
        makePlan({ creditConnectorFreeRequestsPerMonth: null }),
      );
      await expect(service.getView('user-1', NOW, false)).resolves.toBeNull();
    });
  });
});
