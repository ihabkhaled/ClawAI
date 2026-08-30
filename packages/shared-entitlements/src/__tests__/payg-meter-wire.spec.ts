import { BillingErrorCode, PaygSurface } from '@claw/shared-types';

import { PaygCreditExhaustedError } from '../payg-credit-exhausted.error';
import { PaygMeter } from '../payg-meter';

/**
 * The wire contract between auth-service's `/internal/credit/reserve` and this
 * client.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A production incident that local testing could not have caught. The unmetered
 * reply — `{ metered: false, reason }` — was rejected by the client's guard,
 * which required a `maxOutputTokens` the server never sent. An unparseable
 * reply fails CLOSED, so every paid model was refused with "credit checks are
 * temporarily unavailable" while no money was at stake at all.
 *
 * It only reproduced in production because the kill switch is OFF by default
 * there and had been armed locally during QA. Armed, every reserve takes the
 * METERED path, which does carry `maxOutputTokens`. **The default state of the
 * feature was the untested one**, and turning the feature off took the whole
 * product down.
 *
 * So these cases drive the DISABLED path first, and assert the property that
 * actually matters: `metered: false` means no money is at stake, therefore it
 * must never fail closed.
 */
const RESERVE_URL = 'https://auth.test/api/v1/internal/credit/reserve';

function meter(): PaygMeter {
  return new PaygMeter({ authServiceUrl: 'https://auth.test/', interServiceToken: 'tok' });
}

function input(overrides: Partial<Parameters<PaygMeter['reserve']>[0]> = {}) {
  return {
    userId: 'user-1',
    requestId: 'req-1',
    provider: 'OPENAI',
    model: 'gpt-5.6-terra',
    surface: PaygSurface.CHAT,
    promptTokens: 100,
    requestedMaxOutputTokens: 4096,
    ...overrides,
  };
}

function respondWith(status: number, body: unknown): jest.Mock {
  const stub = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

describe('PaygMeter wire contract', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.restoreAllMocks();
  });

  describe('the unmetered reply', () => {
    // The exact 46-byte body production returned, verbatim.
    it('accepts { metered:false, reason } with NO maxOutputTokens', async () => {
      respondWith(200, { metered: false, reason: 'METERING_DISABLED' });

      const hold = await meter().reserve(input());

      expect(hold.metered).toBe(false);
      expect(hold.reason).toBe('METERING_DISABLED');
    });

    it('falls back to the REQUESTED ceiling when the server omits one', async () => {
      respondWith(200, { metered: false, reason: 'METERING_DISABLED' });

      const hold = await meter().reserve(input({ requestedMaxOutputTokens: 1234 }));

      // Not 0, and not undefined — either would silently truncate the answer to
      // nothing on the path that is supposed to be a no-op.
      expect(hold.maxOutputTokens).toBe(1234);
      expect(hold.clamped).toBe(false);
      expect(hold.reservationId).toBeNull();
      expect(hold.heldMicroUsd).toBe(0);
    });

    it('prefers a ceiling the server DID send', async () => {
      respondWith(200, { metered: false, reason: 'ADMIN_BYPASS', maxOutputTokens: 512 });

      const hold = await meter().reserve(input({ requestedMaxOutputTokens: 4096 }));

      expect(hold.maxOutputTokens).toBe(512);
      expect(hold.reason).toBe('ADMIN_BYPASS');
    });

    it.each(['NOT_PAYG', 'METERING_DISABLED', 'ADMIN_BYPASS'])(
      'never fails closed on reason=%s — no money is at stake',
      async (reason) => {
        respondWith(200, { metered: false, reason });

        await expect(meter().reserve(input())).resolves.toMatchObject({
          metered: false,
          reason,
        });
      },
    );
  });

  describe('the metered reply', () => {
    it('carries the granted ceiling, which may be below what was asked', async () => {
      respondWith(200, {
        metered: true,
        reservationId: 'res-1',
        maxOutputTokens: 900,
        clamped: true,
        heldMicroUsd: 1286,
        availableAfterMicroUsd: 4_998_714,
      });

      const hold = await meter().reserve(input({ requestedMaxOutputTokens: 4096 }));

      expect(hold).toMatchObject({
        metered: true,
        maxOutputTokens: 900,
        clamped: true,
        reservationId: 'res-1',
        heldMicroUsd: 1286,
      });
    });
  });

  describe('a reply that really is malformed', () => {
    // The fail-closed branch must stay intact: this is the whole reason the
    // guards are not a cast. Loosening the unmetered guard must not loosen this.
    it.each([
      ['a bare object', {}],
      ['a metered reply with no reservationId', { metered: true, maxOutputTokens: 10 }],
      ['a metered reply with no ceiling', { metered: true, reservationId: 'r', heldMicroUsd: 1 }],
      ['null', null],
      ['an array', []],
      ['a string', 'ok'],
      ['metered as a string', { metered: 'false', reason: 'NOT_PAYG' }],
    ])('refuses %s', async (_label, body) => {
      respondWith(200, body);

      await expect(meter().reserve(input())).rejects.toMatchObject({
        errorCode: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      });
    });
  });

  describe('an exempt provider', () => {
    it('never calls the meter at all', async () => {
      const stub = respondWith(200, {});

      const hold = await meter().reserve(input({ provider: 'OLLAMA' }));

      expect(stub).not.toHaveBeenCalled();
      expect(hold.metered).toBe(false);
      expect(hold.maxOutputTokens).toBe(4096);
    });
  });

  describe('an unreachable meter', () => {
    it('fails CLOSED for a metered provider', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

      await expect(meter().reserve(input())).rejects.toBeInstanceOf(PaygCreditExhaustedError);
    });

    it('fails OPEN for an exempt one', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

      await expect(meter().reserve(input({ provider: 'OLLAMA' }))).resolves.toMatchObject({
        metered: false,
      });
    });
  });

  it('sends the inter-service Authorization header', async () => {
    const stub = respondWith(200, { metered: false, reason: 'NOT_PAYG' });

    await meter().reserve(input());

    expect(stub).toHaveBeenCalledWith(
      RESERVE_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Service tok' }),
      }),
    );
  });
});
