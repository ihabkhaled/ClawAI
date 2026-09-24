import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { PaygMeter } from '../payg-meter';
import { type PaygHold } from '../payg-meter.types';

/**
 * Unit metering on the wire: `imageUnits`, `audioSeconds`, `ttsCharacters`.
 *
 * Two properties matter:
 *  1. A non-token call forwards its units on BOTH reserve (expected) and
 *     finalize (measured) — forwarding only one holds the right money and then
 *     settles at $0, which is how an OpenAI image used to be free.
 *  2. A token-only call sends exactly the body it sent before these fields
 *     existed, so an older auth-service is unaffected.
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

/** The JSON body of the first fetch call, parsed. */
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

describe('PaygMeter unit metering', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the expected image count on reserve', async () => {
    const stub = stubFetch(200, {
      metered: true,
      reservationId: 'res-1',
      maxOutputTokens: 8192,
      clamped: false,
      heldMicroUsd: 167_000,
      availableAfterMicroUsd: 833_000,
    });

    await meter().reserve({
      userId: 'user-1',
      requestId: 'gen-1',
      provider: 'OPENAI',
      model: 'gpt-image-1',
      surface: PaygSurface.IMAGE,
      promptTokens: 0,
      requestedMaxOutputTokens: 8192,
      imageUnits: 1,
    });

    expect(sentBody(stub)).toMatchObject({ imageUnits: 1 });
  });

  it('sends the measured units on finalize, floored', async () => {
    const stub = stubFetch(204, undefined);

    await meter().finalize(
      METERED_HOLD,
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { imageUnits: 1, audioSeconds: 61.9, ttsCharacters: 1200 },
    );

    expect(sentBody(stub)).toMatchObject({
      reservationId: 'res-1',
      imageUnits: 1,
      audioSeconds: 61,
      ttsCharacters: 1200,
    });
  });

  it('leaves a token-only finalize body byte-for-byte unchanged', async () => {
    const stub = stubFetch(204, undefined);

    await meter().finalize(
      METERED_HOLD,
      { promptTokens: 10, completionTokens: 20, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 1 },
    );

    expect(Object.keys(sentBody(stub)).sort()).toEqual(
      ['reservationId', 'searchCalls', 'toolCalls', 'usage'].sort(),
    );
  });

  it('omits zero and negative unit counts rather than sending them', async () => {
    const stub = stubFetch(204, undefined);

    await meter().finalize(
      METERED_HOLD,
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { imageUnits: 0, audioSeconds: -5, ttsCharacters: 0.4 },
    );

    const body = sentBody(stub);
    expect(body).not.toHaveProperty('imageUnits');
    expect(body).not.toHaveProperty('audioSeconds');
    expect(body).not.toHaveProperty('ttsCharacters');
  });

  it('does not call auth to finalize an unmetered hold, units or not', async () => {
    const stub = stubFetch(204, undefined);

    await meter().finalize(
      { ...METERED_HOLD, metered: false, reservationId: null },
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { imageUnits: 1 },
    );

    expect(stub).not.toHaveBeenCalled();
  });
});
