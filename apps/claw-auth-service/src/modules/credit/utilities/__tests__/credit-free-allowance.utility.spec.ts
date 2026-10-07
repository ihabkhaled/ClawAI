import { type CreditReserveInput, type PaygRateSnapshot } from '../../types/credit.types';
import { PaygSurface } from '@claw/shared-types';

import {
  FREE_ALLOWANCE_ELIGIBLE_SURFACES,
  FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
  FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT,
} from '../../constants/credit-free-allowance.constants';
import {
  computeFreeRequestCeilingMicroUsd,
  isCappedAllowance,
  isFreeAllowanceEligible,
  isFreeAllowanceEnabled,
  isModelAboveFreeCap,
  meterUsedPercent,
  nextUtcMonthStart,
  toCounterLimit,
  toFreeAllowanceView,
} from '../credit-free-allowance.utility';

const request = (overrides: Partial<CreditReserveInput> = {}): CreditReserveInput => ({
  userId: 'user-1',
  requestId: 'req-1',
  provider: 'GROK',
  model: 'grok-4',
  surface: PaygSurface.CHAT,
  workflow: null,
  promptTokens: 100,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: 1000,
  ...overrides,
});

describe('isFreeAllowanceEnabled', () => {
  it('null means unlimited, so it is enabled', () => {
    expect(isFreeAllowanceEnabled(null)).toBe(true);
  });

  it('0 means disabled: null and 0 are never interchangeable', () => {
    expect(isFreeAllowanceEnabled(0)).toBe(false);
  });

  it.each([1, 2, 50])('a positive count (%i) is enabled', (limit) => {
    expect(isFreeAllowanceEnabled(limit)).toBe(true);
  });

  it.each([-1, 1.5, Number.NaN])('an impossible value (%s) is treated as disabled', (limit) => {
    expect(isFreeAllowanceEnabled(limit)).toBe(false);
  });
});

describe('toCounterLimit', () => {
  it('turns an unlimited allowance into the INT4 maximum', () => {
    expect(toCounterLimit(null)).toBe(FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT);
  });

  it('passes a finite limit through unchanged', () => {
    expect(toCounterLimit(3)).toBe(3);
  });
});

describe('isFreeAllowanceEligible', () => {
  it.each(FREE_ALLOWANCE_ELIGIBLE_SURFACES)('admits the token-priced surface %s', (surface) => {
    expect(isFreeAllowanceEligible(request({ surface }))).toBe(true);
  });

  it.each([
    PaygSurface.IMAGE,
    PaygSurface.VIDEO,
    PaygSurface.TRANSCRIPTION,
    PaygSurface.TTS,
    PaygSurface.VISION_HELPER,
  ])('excludes %s (per-unit or not a user request)', (surface) => {
    expect(isFreeAllowanceEligible(request({ surface }))).toBe(false);
  });

  it.each([
    ['imageUnits', { imageUnits: 1 }],
    ['audioSeconds', { audioSeconds: 30 }],
    ['ttsCharacters', { ttsCharacters: 500 }],
    ['videoSeconds', { videoSeconds: 8 }],
  ])('excludes a CHAT-labelled call that carries %s', (_name, units) => {
    expect(isFreeAllowanceEligible(request(units))).toBe(false);
  });

  it('treats a zero unit count as no unit', () => {
    expect(isFreeAllowanceEligible(request({ imageUnits: 0, videoSeconds: 0 }))).toBe(true);
  });

  it('never lists a per-unit surface in the allow-list', () => {
    for (const surface of [PaygSurface.IMAGE, PaygSurface.VIDEO, PaygSurface.TTS]) {
      expect(FREE_ALLOWANCE_ELIGIBLE_SURFACES).not.toContain(surface);
    }
  });
});

describe('nextUtcMonthStart', () => {
  it('is the first instant of the next UTC month', () => {
    expect(nextUtcMonthStart(new Date('2026-10-15T12:00:00Z')).toISOString()).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });

  it('rolls the year over in December', () => {
    expect(nextUtcMonthStart(new Date('2026-12-31T23:59:59Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

describe('isCappedAllowance', () => {
  it('is true only for a finite limit', () => {
    const base = { requestCeilingMicroUsd: 1n, budgetMicroUsd: null, maxModelOutputMicroUsd: null };
    expect(isCappedAllowance({ ...base, limit: 5 })).toBe(true);
    expect(isCappedAllowance({ ...base, limit: null })).toBe(false);
  });
});

describe('computeFreeRequestCeilingMicroUsd', () => {
  it('uses the fallback ceiling when the plan has none', () => {
    expect(computeFreeRequestCeilingMicroUsd(null, 2)).toBe(
      FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
    );
  });

  it('uses the fallback ceiling for an unlimited allowance', () => {
    expect(computeFreeRequestCeilingMicroUsd(300_000n, null)).toBe(
      FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
    );
  });

  it('divides the plan ceiling across the allowance: 2 requests of $0.30 is $0.15 each', () => {
    expect(computeFreeRequestCeilingMicroUsd(300_000n, 2)).toBe(150_000n);
  });

  it('raising the allowance shrinks each request so the sum stays inside the ceiling', () => {
    expect(computeFreeRequestCeilingMicroUsd(300_000n, 3)).toBe(100_000n);
  });

  it('never exceeds the fallback even when the plan ceiling is huge', () => {
    expect(computeFreeRequestCeilingMicroUsd(50_000_000n, 2)).toBe(
      FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
    );
  });

  it('floors with integer division', () => {
    expect(computeFreeRequestCeilingMicroUsd(10n, 3)).toBe(3n);
  });

  it('a zero ceiling yields zero, which refuses every request', () => {
    expect(computeFreeRequestCeilingMicroUsd(0n, 2)).toBe(0n);
  });

  it('a zero allowance yields zero instead of dividing by zero', () => {
    expect(computeFreeRequestCeilingMicroUsd(300_000n, 0)).toBe(0n);
  });
});

describe('toFreeAllowanceView', () => {
  const resetsAt = new Date('2026-11-01T00:00:00Z');

  it('reports remaining as limit minus used, and when it resets', () => {
    expect(toFreeAllowanceView(2, 1, resetsAt, 40)).toEqual({
      limit: 2,
      used: 1,
      remaining: 1,
      resetsAt: '2026-11-01T00:00:00.000Z',
      meterUsedPercent: 40,
    });
  });

  it('never reports a negative remaining', () => {
    expect(toFreeAllowanceView(2, 5, resetsAt, null).remaining).toBe(0);
  });

  it('reports null limit and null remaining for an unlimited allowance', () => {
    expect(toFreeAllowanceView(null, 7, resetsAt, null)).toMatchObject({
      limit: null,
      used: 7,
      remaining: null,
    });
  });
});

describe('meterUsedPercent', () => {
  it('is null when the plan has no meter', () => {
    expect(meterUsedPercent(100n, null)).toBeNull();
  });

  it('is a whole percentage of the budget, rounded down', () => {
    expect(meterUsedPercent(0n, 250_000n)).toBe(0);
    expect(meterUsedPercent(62_500n, 250_000n)).toBe(25);
    expect(meterUsedPercent(124_999n, 250_000n)).toBe(49);
  });

  it('shows anything spent as at least 1%, so used credit never reads 0%', () => {
    expect(meterUsedPercent(2_424n, 250_000n)).toBe(1);
    expect(meterUsedPercent(1n, 250_000n)).toBe(1);
    expect(meterUsedPercent(0n, 250_000n)).toBe(0);
  });

  it('never goes past 100, and a zero budget is already spent', () => {
    expect(meterUsedPercent(900_000n, 250_000n)).toBe(100);
    expect(meterUsedPercent(0n, 0n)).toBe(100);
  });
});

describe('isModelAboveFreeCap', () => {
  const rateWithOutput = (output: number | null): PaygRateSnapshot =>
    ({ rates: { outputPerMillionMicroUsd: output } }) as unknown as PaygRateSnapshot;

  it('covers every model when the plan sets no limit', () => {
    expect(isModelAboveFreeCap(rateWithOutput(75_000_000), { maxModelOutputMicroUsd: null })).toBe(
      false,
    );
  });

  it('refuses a model whose output price is above the limit', () => {
    const policy = { maxModelOutputMicroUsd: 5_000_000n };
    expect(isModelAboveFreeCap(rateWithOutput(25_000_000), policy)).toBe(true);
    expect(isModelAboveFreeCap(rateWithOutput(10_000_000), policy)).toBe(true);
  });

  it('covers a model exactly at the limit and anything cheaper', () => {
    const policy = { maxModelOutputMicroUsd: 5_000_000n };
    expect(isModelAboveFreeCap(rateWithOutput(5_000_000), policy)).toBe(false);
    expect(isModelAboveFreeCap(rateWithOutput(400_000), policy)).toBe(false);
  });

  it('does not judge a rate that has no output price', () => {
    expect(isModelAboveFreeCap(rateWithOutput(null), { maxModelOutputMicroUsd: 1n })).toBe(false);
  });
});
