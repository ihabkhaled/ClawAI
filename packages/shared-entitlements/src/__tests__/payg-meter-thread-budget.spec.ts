import { type Mock, vi } from 'vitest';
import { BillingErrorCode, PaygSurface } from '@claw/shared-types';

import { PaygCreditExhaustedError } from '../payg-credit-exhausted.error';
import { PaygMeter } from '../payg-meter';
import { type PaygHold } from '../payg-meter.types';
import { readThreadCallVerdict } from '../payg-thread-call-verdict';

/**
 * A Threads call is booked against its job's spend cap right after the credit
 * hold is taken. These cases pin the three things that went wrong in local QA:
 * a transient failure was reported as a billing outage, a spent cap and a budget
 * that could not be consulted were not told apart, and the cap counted holds
 * where it should count charges.
 */
const BUDGET_ID = 'clx12345678901234567890123';
const WIRE_HOLD = {
  metered: true,
  reservationId: 'res-1',
  maxOutputTokens: 4096,
  clamped: false,
  heldMicroUsd: 21_226,
  availableAfterMicroUsd: 900_000,
};

function reply(status: number, body: unknown): Record<string, unknown> {
  return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) };
}

function meter(): PaygMeter {
  return new PaygMeter({ authServiceUrl: 'https://auth.test', interServiceToken: 'tok' });
}

function reserveInput() {
  return {
    userId: 'user-1',
    requestId: 'job-1:author-1:attempt-1',
    threadJobBudgetId: BUDGET_ID,
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    surface: PaygSurface.THREADS,
    promptTokens: 7600,
    requestedMaxOutputTokens: 4096,
  };
}

function stubSequence(...replies: unknown[]): Mock {
  const stub = vi.fn();
  for (const next of replies) {
    if (next instanceof Error) stub.mockRejectedValueOnce(next);
    else stub.mockResolvedValueOnce(next);
  }
  vi.stubGlobal('fetch', stub);
  return stub;
}

function bodyOf(stub: Mock, call: number): Record<string, unknown> {
  return JSON.parse(String(stub.mock.calls[call]?.[1]?.body)) as Record<string, unknown>;
}

function urlOf(stub: Mock, call: number): string {
  return String(stub.mock.calls[call]?.[0]);
}

async function refusal(): Promise<PaygCreditExhaustedError> {
  const failure = await meter()
    .reserve(reserveInput())
    .catch((error: unknown) => error);
  if (!(failure instanceof PaygCreditExhaustedError)) {
    throw new Error('expected the reserve to be refused');
  }
  return failure;
}

describe('PaygMeter Threads call against the job budget', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the job budget to auth on the credit reserve so the hold is sized to the cap', async () => {
    const stub = stubSequence(reply(200, WIRE_HOLD), reply(200, { reserved: true }));

    await meter().reserve(reserveInput());

    expect(urlOf(stub, 0)).toContain('/internal/credit/reserve');
    expect(bodyOf(stub, 0)).toMatchObject({ threadJobBudgetId: BUDGET_ID });
  });

  it('does not add the budget field for any other caller', async () => {
    const stub = stubSequence(reply(200, WIRE_HOLD));

    await meter().reserve({ ...reserveInput(), threadJobBudgetId: undefined });

    expect(bodyOf(stub, 0)).not.toHaveProperty('threadJobBudgetId');
  });

  it('asks for the detailed answer and sends the hold as integer micro-USD', async () => {
    const stub = stubSequence(reply(200, WIRE_HOLD), reply(200, { reserved: true }));

    await meter().reserve(reserveInput());

    expect(urlOf(stub, 1)).toContain('/internal/threads/budgets/calls/reserve');
    const sent = bodyOf(stub, 1);
    expect(sent).toMatchObject({
      budgetId: BUDGET_ID,
      requestId: 'job-1:author-1:attempt-1',
      creditReservationId: 'res-1',
      amountMicroUsd: 21_226,
      detailed: true,
    });
    expect(Number.isInteger(sent['amountMicroUsd'])).toBe(true);
  });

  it('lets the call proceed on a repeated reservation of the same request id', async () => {
    stubSequence(
      reply(200, WIRE_HOLD),
      reply(200, { reserved: true, outcome: 'ALREADY_RESERVED', remainingMicroUsd: 100 }),
    );
    await expect(meter().reserve(reserveInput())).resolves.toMatchObject({
      metered: true,
      threadJobBudgetId: BUDGET_ID,
      threadJobRequestId: 'job-1:author-1:attempt-1',
    });
  });

  it('keeps working against an auth-service that still answers a bare true', async () => {
    stubSequence(reply(200, WIRE_HOLD), reply(200, true));
    await expect(meter().reserve(reserveInput())).resolves.toMatchObject({ metered: true });
  });

  describe('refusals are told apart', () => {
    it('a cap with money left but less than the call needs is PAYG_CAP_TOO_LOW with the cap left, and the hold goes back', async () => {
      const stub = stubSequence(
        reply(200, WIRE_HOLD),
        reply(200, { reserved: false, outcome: 'CAP_EXCEEDED', remainingMicroUsd: 4_000 }),
        reply(204, undefined),
      );

      const failure = await refusal();

      expect(failure.errorCode).toBe(BillingErrorCode.PAYG_CAP_TOO_LOW);
      expect(failure.availableMicroUsd).toBe(4_000);
      expect(failure.requiredMicroUsd).toBe(21_226);
      expect(urlOf(stub, 2)).toContain('/internal/credit/release');
      expect(bodyOf(stub, 2)).toMatchObject({ reservationId: 'res-1', reason: 'CANCELLED' });
    });

    it('a budget that is closed (the job ended or was cancelled) is refused, not retried', async () => {
      stubSequence(
        reply(200, WIRE_HOLD),
        reply(200, { reserved: false, outcome: 'BUDGET_CLOSED', remainingMicroUsd: 0 }),
        reply(204, undefined),
      );
      expect((await refusal()).errorCode).toBe(BillingErrorCode.PAYG_CREDIT_EXHAUSTED);
    });

    it('a budget that could not be reached is the temporary PAYG_PRICING_UNAVAILABLE, never a spent cap', async () => {
      const stub = stubSequence(
        reply(200, WIRE_HOLD),
        reply(503, { code: 'THREAD_BUDGET_BUSY' }),
        reply(204, undefined),
      );

      const failure = await refusal();

      expect(failure.errorCode).toBe(BillingErrorCode.PAYG_PRICING_UNAVAILABLE);
      expect(urlOf(stub, 2)).toContain('/internal/credit/release');
    });

    it('a network failure is the temporary answer too', async () => {
      stubSequence(reply(200, WIRE_HOLD), new Error('socket hang up'), reply(204, undefined));
      expect((await refusal()).errorCode).toBe(BillingErrorCode.PAYG_PRICING_UNAVAILABLE);
    });

    it('a duplicate of a call that already ended is not reported as an empty wallet', async () => {
      stubSequence(
        reply(200, WIRE_HOLD),
        reply(200, { reserved: false, outcome: 'ALREADY_FINALIZED', remainingMicroUsd: 10 }),
        reply(204, undefined),
      );
      expect((await refusal()).errorCode).toBe(BillingErrorCode.PAYG_PRICING_UNAVAILABLE);
    });

    it('an old auth-service answering a bare false is still a spent cap', async () => {
      stubSequence(reply(200, WIRE_HOLD), reply(200, false), reply(204, undefined));
      expect((await refusal()).errorCode).toBe(BillingErrorCode.PAYG_CREDIT_EXHAUSTED);
    });

    it('an unreadable answer fails closed', async () => {
      stubSequence(reply(200, WIRE_HOLD), reply(200, 'maybe'), reply(204, undefined));
      expect((await refusal()).errorCode).toBe(BillingErrorCode.PAYG_PRICING_UNAVAILABLE);
    });
  });

  describe('four parallel authors on one job', () => {
    it('all proceed, each booking its own call', async () => {
      const stub = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve(
          url.includes('/credit/reserve')
            ? reply(200, WIRE_HOLD)
            : reply(200, { reserved: true, outcome: 'RESERVED' }),
        );
      });
      vi.stubGlobal('fetch', stub);

      const holds = await Promise.all(
        [1, 2, 3, 4].map((n) =>
          meter().reserve({ ...reserveInput(), requestId: `job-1:author-${String(n)}:attempt-1` }),
        ),
      );

      expect(holds.every((hold) => hold.metered)).toBe(true);
      const booked = stub.mock.calls
        .filter(([url]) => String(url).includes('/calls/reserve'))
        .map(([, init]) => (JSON.parse(String(init.body)) as { requestId: string }).requestId);
      expect(new Set(booked).size).toBe(4);
    });
  });

  describe('finalize counts what was charged (D3)', () => {
    const HOLD: PaygHold = {
      metered: true,
      maxOutputTokens: 4096,
      clamped: false,
      reservationId: 'res-1',
      heldMicroUsd: 21_226,
      availableAfterMicroUsd: 0,
      reason: null,
      threadJobBudgetId: BUDGET_ID,
      threadJobRequestId: 'job-1:author-1:attempt-1',
    };
    const USAGE = {
      promptTokens: 7600,
      completionTokens: 900,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    };

    it('settles the budget at the disclosed cost, not at the hold', async () => {
      const stub = stubSequence(
        reply(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: 4_829 }),
        reply(200, true),
      );

      await meter().finalize(HOLD, USAGE);

      expect(urlOf(stub, 1)).toContain('/calls/finalize');
      expect(bodyOf(stub, 1)).toMatchObject({ settledMicroUsd: 4_829 });
    });

    it('settles a plan-granted user at zero rather than at the hold', async () => {
      const stub = stubSequence(
        reply(200, { settled: true, billingMode: 'SUBSCRIPTION' }),
        reply(200, true),
      );
      await meter().finalize(HOLD, USAGE);
      expect(bodyOf(stub, 1)).toMatchObject({ settledMicroUsd: 0 });
    });

    it('falls back to the hold, the conservative figure, when no cost was disclosed', async () => {
      const stub = stubSequence(
        reply(200, { settled: true, billingMode: 'UNKNOWN' }),
        reply(200, true),
      );
      await meter().finalize(HOLD, USAGE);
      expect(bodyOf(stub, 1)).toMatchObject({ settledMicroUsd: 21_226 });
    });

    it('still books the call when the credit finalize itself failed', async () => {
      const stub = stubSequence(new Error('auth unavailable'), reply(200, true));

      await expect(meter().finalize(HOLD, USAGE)).resolves.toBeUndefined();

      expect(urlOf(stub, 1)).toContain('/calls/finalize');
      expect(bodyOf(stub, 1)).toMatchObject({ settledMicroUsd: 21_226 });
    });

    it('never throws when the budget call fails as well', async () => {
      stubSequence(new Error('auth unavailable'), new Error('auth unavailable'));
      await expect(meter().finalize(HOLD, USAGE)).resolves.toBeUndefined();
    });

    it('does not touch the budget for a call that has none', async () => {
      const stub = stubSequence(
        reply(200, { settled: true, billingMode: 'PAYG', settledCostMicroUsd: 5 }),
      );
      await meter().finalize(
        { ...HOLD, threadJobBudgetId: undefined, threadJobRequestId: undefined },
        USAGE,
      );
      expect(stub).toHaveBeenCalledTimes(1);
    });
  });
});

describe('readThreadCallVerdict', () => {
  it.each([
    [true, { reserved: true }],
    [{ reserved: true, outcome: 'RESERVED', remainingMicroUsd: 5 }, { reserved: true }],
  ])('allows %j', (payload, expected) => {
    expect(readThreadCallVerdict(payload)).toEqual(expected);
  });

  it.each([
    ['CAP_EXCEEDED', BillingErrorCode.PAYG_CAP_TOO_LOW],
    ['BUDGET_CLOSED', BillingErrorCode.PAYG_CREDIT_EXHAUSTED],
    ['BUDGET_NOT_FOUND', BillingErrorCode.PAYG_CREDIT_EXHAUSTED],
    ['ALREADY_FINALIZED', BillingErrorCode.PAYG_PRICING_UNAVAILABLE],
    ['ALREADY_RELEASED', BillingErrorCode.PAYG_PRICING_UNAVAILABLE],
    ['SOMETHING_NEW', BillingErrorCode.PAYG_PRICING_UNAVAILABLE],
  ])('maps the refusal %s to %s', (outcome, errorCode) => {
    expect(readThreadCallVerdict({ reserved: false, outcome, remainingMicroUsd: 7 })).toEqual({
      reserved: false,
      errorCode,
      remainingMicroUsd: 7,
    });
  });

  it.each([null, undefined, 'true', 1, [], {}, { reserved: 'yes' }])(
    'fails closed on %j',
    (payload) => {
      expect(readThreadCallVerdict(payload)).toMatchObject({
        reserved: false,
        errorCode: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      });
    },
  );

  it('a cap with nothing left is PAYG_CREDIT_EXHAUSTED, not a cap that is too low', () => {
    expect(
      readThreadCallVerdict({ reserved: false, outcome: 'CAP_EXCEEDED', remainingMicroUsd: 0 }),
    ).toEqual({
      reserved: false,
      errorCode: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      remainingMicroUsd: 0,
    });
  });

  it.each([-5, 1.5, Number.NaN, 2 ** 60, '9'])('never trusts a remaining figure of %j', (value) => {
    expect(
      readThreadCallVerdict({ reserved: false, outcome: 'CAP_EXCEEDED', remainingMicroUsd: value }),
    ).toMatchObject({ remainingMicroUsd: 0 });
  });
});
