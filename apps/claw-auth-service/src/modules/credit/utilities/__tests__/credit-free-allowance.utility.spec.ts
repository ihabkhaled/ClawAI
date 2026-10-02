import { PaygSurface } from '@claw/shared-types';

import {
  FREE_ALLOWANCE_ELIGIBLE_SURFACES,
  FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
  FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT,
} from '../../constants/credit-free-allowance.constants';
import { type CreditReserveInput } from '../../types/credit.types';
import {
  computeFreeRequestCeilingMicroUsd,
  isCappedAllowance,
  isFreeAllowanceEligible,
  isFreeAllowanceEnabled,
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
    expect(isCappedAllowance({ limit: 5, requestCeilingMicroUsd: 1n })).toBe(true);
    expect(isCappedAllowance({ limit: null, requestCeilingMicroUsd: 1n })).toBe(false);
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
    expect(toFreeAllowanceView(2, 1, resetsAt)).toEqual({
      limit: 2,
      used: 1,
      remaining: 1,
      resetsAt: '2026-11-01T00:00:00.000Z',
    });
  });

  it('never reports a negative remaining', () => {
    expect(toFreeAllowanceView(2, 5, resetsAt).remaining).toBe(0);
  });

  it('reports null limit and null remaining for an unlimited allowance', () => {
    expect(toFreeAllowanceView(null, 7, resetsAt)).toMatchObject({
      limit: null,
      used: 7,
      remaining: null,
    });
  });
});
