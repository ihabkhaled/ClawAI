import { describe, expect, it } from 'vitest';

import { LIVE_SERVER_PULL_PLATFORMS } from '@/constants/live.constants';
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
  visionModelChain: [],
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
