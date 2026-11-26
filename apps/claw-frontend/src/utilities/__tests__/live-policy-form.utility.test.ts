import { describe, expect, it } from 'vitest';

import { LIVE_COUNCIL_DEFAULT_CHAIN } from '@/constants/live-model-chain.constants';
import { LIVE_SERVER_PULL_PLATFORMS } from '@/constants/live.constants';
import { LiveModelChainKind } from '@/enums/live-model-chain.enum';
import { LivePlatform } from '@/enums/live.enum';
import type { LivePolicyConfig } from '@/types/live-admin.types';
import {
  liveFormValuesToPolicy,
  liveMinutesInputToSeconds,
  livePolicyToFormValues,
  liveSecondsToMinutesInput,
} from '@/utilities/live-policy-form.utility';

const CONFIG: LivePolicyConfig = {
  featureEnabled: true,
  killSwitch: false,
  plans: {
    free: { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 },
    pro: { freeSecondsPerMonth: 36_000, paidMicroUsdPerMinute: 20_000 },
  },
  defaultPlan: { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 },
  visionBilling: 'ACTUAL_COST',
  graceSeconds: 60,
  maxActiveStreams: 10,
  maxSessionsPerUser: 2,
  sessionsPerUserPerHour: 10,
  dailyBudgetMicroUsd: 20_000_000,
  budgetSoftStopPercent: 80,
  summaryModelChain: [{ connector: 'GEMINI', model: 'gemini-flash', style: 'OPENAI_COMPAT' }],
  visionModelChain: [{ connector: 'GEMINI', model: 'gemini-vision', style: 'OPENAI_COMPAT' }],
};

describe('minutes <-> seconds', () => {
  it('converts both ways, including fractional minutes', () => {
    expect(liveSecondsToMinutesInput(1800)).toBe('30');
    expect(liveSecondsToMinutesInput(90)).toBe('1.5');
    expect(liveMinutesInputToSeconds('30')).toBe(1800);
    expect(liveMinutesInputToSeconds('1.5')).toBe(90);
  });

  it('rejects negative, empty and malformed minutes', () => {
    expect(liveMinutesInputToSeconds('-1')).toBeNull();
    expect(liveMinutesInputToSeconds('')).toBeNull();
    expect(liveMinutesInputToSeconds('1.2.3')).toBeNull();
    expect(liveMinutesInputToSeconds('abc')).toBeNull();
  });
});

describe('policy form round trip', () => {
  it('shows minutes and dollars', () => {
    const values = livePolicyToFormValues(CONFIG);
    expect(values.plans).toEqual([
      { plan: 'free', freeMinutes: '30', paidUsdPerMinute: '0.02' },
      { plan: 'pro', freeMinutes: '600', paidUsdPerMinute: '0.02' },
    ]);
    expect(values.dailyBudgetUsd).toBe('20');
  });

  it('stores seconds and integer micro-USD, keeping the chains it does not edit', () => {
    const values = livePolicyToFormValues(CONFIG);
    values.plans[0] = { plan: 'free', freeMinutes: '45', paidUsdPerMinute: '0.03' };
    values.dailyBudgetUsd = '25.5';
    const result = liveFormValuesToPolicy(values, CONFIG);
    expect(result.invalidField).toBeNull();
    expect(result.config?.plans.free).toEqual({
      freeSecondsPerMonth: 2700,
      paidMicroUsdPerMinute: 30_000,
    });
    expect(result.config?.dailyBudgetMicroUsd).toBe(25_500_000);
    expect(result.config?.summaryModelChain).toEqual(CONFIG.summaryModelChain);
  });

  it('names the first invalid field', () => {
    const values = livePolicyToFormValues(CONFIG);
    values.plans[1] = { plan: 'pro', freeMinutes: 'x', paidUsdPerMinute: '0.02' };
    expect(liveFormValuesToPolicy(values, CONFIG)).toEqual({
      config: null,
      invalidField: 'plans.pro.freeMinutes',
    });
    const budget = { ...livePolicyToFormValues(CONFIG), dailyBudgetUsd: '1.1234567' };
    expect(liveFormValuesToPolicy(budget, CONFIG).invalidField).toBe('dailyBudgetUsd');
    const grace = { ...livePolicyToFormValues(CONFIG), graceSeconds: '1.5' };
    expect(liveFormValuesToPolicy(grace, CONFIG).invalidField).toBe('graceSeconds');
  });
});

describe('server pull switch', () => {
  it('on stores every server-pull platform (all but Discord); off stores none', () => {
    const on = livePolicyToFormValues({ ...CONFIG, serverPullPlatforms: [LivePlatform.TWITCH] });
    expect(on.serverPull).toBe(true);
    const stored = liveFormValuesToPolicy(on, CONFIG).config?.serverPullPlatforms;
    expect(stored).toEqual([...LIVE_SERVER_PULL_PLATFORMS]);
    expect(stored).toHaveLength(Object.values(LivePlatform).length - 1);
    expect(stored).not.toContain(LivePlatform.DISCORD);
    const off = livePolicyToFormValues({ ...CONFIG, serverPullPlatforms: [] });
    expect(off.serverPull).toBe(false);
    expect(liveFormValuesToPolicy(off, CONFIG).config?.serverPullPlatforms).toEqual([]);
  });

  it('treats a version saved before the field existed as the default (on)', () => {
    const values = livePolicyToFormValues(CONFIG);
    expect(values.serverPull).toBe(true);
    values.serverPull = false;
    expect(liveFormValuesToPolicy(values, CONFIG).config?.serverPullPlatforms).toEqual([]);
  });
});

describe('model chains', () => {
  const ollama = { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' };

  it('round-trips the main, vision and council chains', () => {
    const council = [ollama, { ...ollama, model: 'deepseek-v4.1-flash' }];
    const values = livePolicyToFormValues({ ...CONFIG, councilModelChain: council });
    expect(values.modelChains[LiveModelChainKind.SUMMARY]).toEqual(CONFIG.summaryModelChain);
    expect(values.modelChains[LiveModelChainKind.VISION]).toEqual(CONFIG.visionModelChain);
    expect(values.modelChains[LiveModelChainKind.COUNCIL]).toEqual(council);
    values.modelChains[LiveModelChainKind.SUMMARY] = [ollama, ...CONFIG.summaryModelChain];
    const config = liveFormValuesToPolicy(values, CONFIG).config;
    expect(config?.summaryModelChain).toEqual([ollama, ...CONFIG.summaryModelChain]);
    expect(config?.visionModelChain).toEqual(CONFIG.visionModelChain);
    expect(config?.councilModelChain).toEqual(council);
  });

  it('gives a version saved before the council the one default agent', () => {
    const values = livePolicyToFormValues(CONFIG);
    expect(values.modelChains[LiveModelChainKind.COUNCIL]).toEqual(LIVE_COUNCIL_DEFAULT_CHAIN);
    expect(liveFormValuesToPolicy(values, CONFIG).config?.councilModelChain).toEqual(
      LIVE_COUNCIL_DEFAULT_CHAIN,
    );
  });

  it('names a chain outside its limits: main 1..5, vision 1..5, council 1..3', () => {
    const cases: Array<[LiveModelChainKind, number]> = [
      [LiveModelChainKind.SUMMARY, 0],
      [LiveModelChainKind.SUMMARY, 6],
      [LiveModelChainKind.VISION, 0],
      [LiveModelChainKind.COUNCIL, 0],
      [LiveModelChainKind.COUNCIL, 4],
    ];
    for (const [kind, length] of cases) {
      const values = livePolicyToFormValues(CONFIG);
      values.modelChains[kind] = Array.from({ length }, () => ollama);
      expect(liveFormValuesToPolicy(values, CONFIG)).toEqual({ config: null, invalidField: kind });
    }
    const atMax = livePolicyToFormValues(CONFIG);
    atMax.modelChains[LiveModelChainKind.SUMMARY] = Array.from({ length: 5 }, () => ollama);
    atMax.modelChains[LiveModelChainKind.COUNCIL] = Array.from({ length: 3 }, () => ollama);
    expect(liveFormValuesToPolicy(atMax, CONFIG).invalidField).toBeNull();
  });
});
