import { type Mock, vi } from 'vitest';
import { PaygBillingMode } from '@claw/shared-types';

import { PaygMeter } from '../payg-meter';
import { type PaygHold } from '../payg-meter.types';

/**
 * F108: what the meter hands back from finalize.
 *
 * The reply carries the one number the platform treats as internal margin, so
 * the contract under test is "fail closed": the cost survives only for a user
 * auth-service positively named PAYG, and only as a non-negative integer. Every
 * other shape - old auth-service (204), unknown mode, subscription, a stray
 * cost on a non-PAYG reply, a float - must come back WITHOUT a cost, and a
 * failed request must still never throw.
 */
const METERED_HOLD: PaygHold = {
  metered: true,
  maxOutputTokens: 8192,
  clamped: false,
  reservationId: 'res-1',
  heldMicroUsd: 167_000,
  availableAfterMicroUsd: 833_000,
  reason: null,
};

const UNMETERED_HOLD: PaygHold = {
  ...METERED_HOLD,
  metered: false,
  reservationId: null,
  reason: 'NOT_PAYG',
};

const USAGE = { promptTokens: 10, completionTokens: 20, cachedPromptTokens: 0, reasoningTokens: 0 };

function meter(): PaygMeter {
  return new PaygMeter({ authServiceUrl: 'https://auth.test', interServiceToken: 'tok' });
}

function stubFetch(status: number, body: unknown): Mock {
  const stub = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}

describe('PaygMeter.finalize outcome (F108)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the settled cost for a PAYG user', async () => {
    stubFetch(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: 21_000 });
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toEqual({
      settled: true,
      billingMode: PaygBillingMode.PAYG,
      settledCostMicroUsd: 21_000,
    });
  });

  it('keeps a zero cost as zero, not as absent', async () => {
    stubFetch(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: 0 });
    const outcome = await meter().finalize(METERED_HOLD, USAGE);
    expect(outcome?.settledCostMicroUsd).toBe(0);
  });

  it('drops a cost sent for a SUBSCRIPTION user', async () => {
    stubFetch(200, { settled: true, billingMode: 'SUBSCRIPTION', settledCostMicroUsd: 21_000 });
    const outcome = await meter().finalize(METERED_HOLD, USAGE);
    expect(outcome).toEqual({ settled: true, billingMode: PaygBillingMode.SUBSCRIPTION });
    expect(outcome).not.toHaveProperty('settledCostMicroUsd');
  });

  it.each([
    ['an unrecognised mode', { settled: true, billingMode: 'ENTERPRISE', settledCostMicroUsd: 5 }],
    ['a missing mode', { settled: true, settledCostMicroUsd: 5 }],
    ['a non-string mode', { settled: true, billingMode: 1, settledCostMicroUsd: 5 }],
    ['an explicit UNKNOWN', { settled: true, billingMode: 'UNKNOWN', settledCostMicroUsd: 5 }],
  ])('fails closed on %s: cost dropped, mode UNKNOWN', async (_label, body) => {
    stubFetch(200, body);
    const outcome = await meter().finalize(METERED_HOLD, USAGE);
    expect(outcome?.billingMode).toBe(PaygBillingMode.UNKNOWN);
    expect(outcome).not.toHaveProperty('settledCostMicroUsd');
  });

  it.each([
    ['a float', 1.5],
    ['a negative', -1],
    ['a string', '21000'],
    ['NaN', Number.NaN],
    ['beyond the safe integer range', Number.MAX_SAFE_INTEGER + 2],
    ['null', null],
  ])('drops a PAYG cost that is %s', async (_label, cost) => {
    stubFetch(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: cost });
    const outcome = await meter().finalize(METERED_HOLD, USAGE);
    expect(outcome?.billingMode).toBe(PaygBillingMode.PAYG);
    expect(outcome).not.toHaveProperty('settledCostMicroUsd');
  });

  it('reports a replayed reservation as not settled', async () => {
    stubFetch(200, { settled: false, billingMode: 'PAYG' });
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toEqual({
      settled: false,
      billingMode: PaygBillingMode.PAYG,
    });
  });

  it('stays backward compatible with an auth-service that still answers 204', async () => {
    stubFetch(204, undefined);
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toBeUndefined();
  });

  it('returns undefined for a body that is not an object', async () => {
    stubFetch(200, 'ok');
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toBeUndefined();
  });

  it('never throws and returns undefined when the request fails', async () => {
    stubFetch(500, null);
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(meter().finalize(METERED_HOLD, USAGE)).resolves.toBeUndefined();
  });

  it('does not call auth for an unmetered hold', async () => {
    const stub = stubFetch(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: 1 });
    await expect(meter().finalize(UNMETERED_HOLD, USAGE)).resolves.toBeUndefined();
    expect(stub).not.toHaveBeenCalled();
  });
});
