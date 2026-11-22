import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { PaygMeter } from '../payg-meter';
import { type PaygHold } from '../payg-meter.types';

/**
 * Fixed-price surfaces on the wire (ADR-221): `fixedCostMicroUsd` is forwarded
 * on BOTH reserve and finalize, zero included, and absent for every other call
 * so their bodies are byte-for-byte unchanged.
 */
const METERED_HOLD: PaygHold = {
  metered: true,
  maxOutputTokens: 1,
  clamped: false,
  reservationId: 'res-1',
  heldMicroUsd: 20_000,
  availableAfterMicroUsd: 980_000,
  reason: null,
};

const RESERVED_REPLY = {
  metered: true,
  reservationId: 'res-1',
  maxOutputTokens: 1,
  clamped: false,
  heldMicroUsd: 20_000,
  availableAfterMicroUsd: 980_000,
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sentBody(stub: Mock): Record<string, unknown> {
  const init: unknown = stub.mock.calls[0]?.[1];
  if (!isRecord(init) || typeof init['body'] !== 'string') {
    throw new Error('fetch was not called with a string body');
  }
  const parsed: unknown = JSON.parse(init['body']);
  if (!isRecord(parsed)) {
    throw new Error('body is not an object');
  }
  return parsed;
}

const LIVE_RESERVE = {
  userId: 'user-1',
  requestId: 'live:sess-1:0',
  provider: 'CLAW_LIVE',
  model: 'live-intelligence',
  surface: PaygSurface.LIVE_INTELLIGENCE,
  promptTokens: 0,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: 1,
};

describe('PaygMeter fixed-price wire', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards fixedCostMicroUsd on reserve with no unit fields', async () => {
    const stub = stubFetch(200, RESERVED_REPLY);

    await meter().reserve({ ...LIVE_RESERVE, fixedCostMicroUsd: 20_000 });

    const body = sentBody(stub);
    expect(body['fixedCostMicroUsd']).toBe(20_000);
    expect(body).not.toHaveProperty('audioSeconds');
  });

  it('forwards a zero price rather than dropping it', async () => {
    const stub = stubFetch(200, RESERVED_REPLY);

    await meter().reserve({ ...LIVE_RESERVE, fixedCostMicroUsd: 0 });

    expect(sentBody(stub)['fixedCostMicroUsd']).toBe(0);
  });

  it('rounds a fractional price up, never down', async () => {
    const stub = stubFetch(200, RESERVED_REPLY);

    await meter().reserve({ ...LIVE_RESERVE, fixedCostMicroUsd: 19_999.2 });

    expect(sentBody(stub)['fixedCostMicroUsd']).toBe(20_000);
  });

  it('forwards fixedCostMicroUsd on finalize', async () => {
    const stub = stubFetch(200, {
      settled: true,
      billingMode: 'PAYG',
      settledCostMicroUsd: 20_000,
    });

    await meter().finalize(
      METERED_HOLD,
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { fixedCostMicroUsd: 20_000 },
    );

    expect(sentBody(stub)['fixedCostMicroUsd']).toBe(20_000);
  });

  it('sends no fixedCostMicroUsd field for an ordinary call', async () => {
    const stub = stubFetch(200, RESERVED_REPLY);

    await meter().reserve({
      ...LIVE_RESERVE,
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      promptTokens: 100,
      requestedMaxOutputTokens: 512,
    });

    expect(sentBody(stub)).not.toHaveProperty('fixedCostMicroUsd');
  });
});
