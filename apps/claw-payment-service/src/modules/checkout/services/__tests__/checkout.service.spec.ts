import { type Mock, vi } from 'vitest';
import {
  BillingGateway,
  BillingInterval,
  CheckoutPurpose,
  CheckoutSessionStatus,
} from '@claw/shared-types';
import { Logger } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { BillingException } from '../../../../common/errors';
import { CheckoutService } from '../checkout.service';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { ChargeResolverService } from '../charge-resolver.service';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';

const INPUT = {
  userId: 'user-1',
  userEmail: 'buyer@example.com',
  planId: 'plan-pro',
  billingInterval: BillingInterval.MONTHLY,
  gateway: BillingGateway.PAYPAL,
  idempotencyKey: 'idem-abcdefgh',
};

const CHARGE = {
  planPriceVersionId: 'ppv-1',
  baseAmountMinor: 1999,
  baseCurrency: 'USD',
  chargeAmountMinor: 1999,
  chargeCurrency: 'USD',
  fxQuoteId: null,
  fxFinalRateScaled: null,
};

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs-1',
    userId: 'user-1',
    purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
    status: CheckoutSessionStatus.CREATED,
    gateway: BillingGateway.PAYPAL,
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'ppv-1',
    billingInterval: BillingInterval.MONTHLY,
    chargeAmountMinor: 1999,
    chargeCurrency: 'USD',
    baseAmountMinor: 1999,
    baseCurrency: 'USD',
    idempotencyKey: 'idem-abcdefgh',
    stateNonce: 'nonce-value',
    paymentMethodConsentedAt: null,
    hostedCheckoutUrl: null,
    providerOrderId: null,
    expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

type SessionRepoMock = {
  create: Mock;
  findById: Mock;
  findByIdempotencyKey: Mock;
  attachProviderOrder: Mock;
  markFailed: Mock;
};

describe('CheckoutService', () => {
  let sessions: SessionRepoMock;
  let charges: { resolve: Mock };
  let paypal: { createOrder: Mock };
  let paymob: { createIntention: Mock };
  let service: CheckoutService;

  beforeEach(() => {
    sessions = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      attachProviderOrder: vi.fn(),
      markFailed: vi.fn(),
    };
    charges = { resolve: vi.fn().mockResolvedValue({ ...CHARGE, planSlug: 'pro' }) };
    paypal = {
      createOrder: vi.fn().mockResolvedValue({
        orderId: 'PP-1',
        status: 'CREATED',
        approvalUrl: 'https://pp/approve',
      }),
    };
    paymob = {
      createIntention: vi.fn().mockResolvedValue({
        intentionId: 'PM-1',
        providerOrderId: 'PM-ORDER-1',
        clientSecret: 'cs_secret',
      }),
    };
    const runtimeConfig = {
      getPaymobCheckout: vi.fn().mockResolvedValue({ publicKey: 'pk_test' }),
    };
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      FRONTEND_URL: 'https://claw.local',
      PAYMOB_PUBLIC_KEY: 'pk_test',
    } as ReturnType<typeof AppConfig.get>);

    service = new CheckoutService(
      sessions as unknown as CheckoutSessionRepository,
      charges as unknown as ChargeResolverService,
      paypal as unknown as PaypalAdapter,
      paymob as unknown as PaymobAdapter,
      runtimeConfig as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replays an existing session for a reused idempotency key', async () => {
    // A double-submit must not create a second payable order. This is the
    // difference between one charge and two.
    sessions.findByIdempotencyKey.mockResolvedValue(
      makeSession({ id: 'cs-original', hostedCheckoutUrl: 'https://pp/original' }),
    );

    const view = await service.start(INPUT);

    expect(view.id).toBe('cs-original');
    expect(sessions.create).not.toHaveBeenCalled();
    expect(paypal.createOrder).not.toHaveBeenCalled();
  });

  it('commits the session before calling the gateway', async () => {
    const order: string[] = [];
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockImplementation(async () => {
      order.push('create');
      return makeSession();
    });
    paypal.createOrder.mockImplementation(async () => {
      order.push('gateway');
      return { orderId: 'PP-1', status: 'CREATED', approvalUrl: 'https://pp/approve' };
    });

    await service.start(INPUT);

    // If the provider call succeeds but its response is lost, we must still
    // hold a record of what we intended to charge — otherwise the money exists
    // with no order behind it and reconciliation has nothing to match.
    expect(order).toEqual(['create', 'gateway']);
  });

  it('never sends a client-supplied amount to the gateway', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(makeSession());

    await service.start(INPUT);

    expect(paypal.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 1999, currency: 'USD', checkoutSessionId: 'cs-1' }),
    );
  });

  it('freezes the authenticated billing recipient on the checkout session', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(makeSession());

    await service.start(INPUT);

    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ billingEmail: 'buyer@example.com' }),
    );
  });

  it('stores the server-resolved plan slug rather than copying the opaque plan id', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(makeSession());

    await service.start(INPUT);

    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'plan-pro', planSlug: 'pro' }),
    );
  });

  it('builds the return URL from configuration, not from the request', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(makeSession());

    await service.start(INPUT);

    const call = paypal.createOrder.mock.calls[0]?.[0] as { returnUrl: string; cancelUrl: string };
    expect(call.returnUrl).toContain('https://claw.local/billing/return');
    expect(call.returnUrl).toContain('session=cs-1');
    expect(call.cancelUrl).toContain('https://claw.local/billing/cancelled');
  });

  it('records a stable failure code when the gateway call fails', async () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(makeSession());
    paypal.createOrder.mockRejectedValue(new Error('paypal down: payer bob@example.com'));

    await expect(service.start(INPUT)).rejects.toThrow('paypal down');

    // A machine code, never the provider message — which here carries a payer
    // email that must not be persisted on our record.
    expect(sessions.markFailed).toHaveBeenCalledWith('cs-1', 'GATEWAY_UNAVAILABLE');
    expect(errorLog).toHaveBeenCalledWith(
      'start: gateway order failed session=cs-1 code=GATEWAY_UNAVAILABLE',
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('bob@example.com');
  });

  it('routes a Paymob checkout through the intention API', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(
      makeSession({ gateway: BillingGateway.PAYMOB, chargeCurrency: 'EGP' }),
    );

    const view = await service.start({ ...INPUT, gateway: BillingGateway.PAYMOB });

    expect(paymob.createIntention).toHaveBeenCalledWith(
      expect.objectContaining({ billingEmail: 'buyer@example.com' }),
    );
    expect(view.hostedCheckoutUrl).toContain('clientSecret=cs_secret');
    expect(sessions.attachProviderOrder).toHaveBeenCalledWith(
      'cs-1',
      'PM-ORDER-1',
      expect.any(String),
    );
  });

  describe('findOwned', () => {
    it('returns a session the caller owns', async () => {
      sessions.findById.mockResolvedValue(makeSession());
      await expect(service.findOwned('user-1', 'cs-1')).resolves.toMatchObject({ id: 'cs-1' });
    });

    it("reports another user's session as not found, not forbidden", async () => {
      // Answering FORBIDDEN would confirm the id exists, turning this endpoint
      // into an oracle for enumerating other customers' sessions.
      sessions.findById.mockResolvedValue(makeSession({ userId: 'someone-else' }));

      await expect(service.findOwned('user-1', 'cs-1')).rejects.toMatchObject({
        code: 'CHECKOUT_SESSION_NOT_FOUND',
      });
    });

    it('rejects an unknown session', async () => {
      sessions.findById.mockResolvedValue(null);
      await expect(service.findOwned('user-1', 'nope')).rejects.toThrow(BillingException);
    });
  });

  it('never exposes the state nonce to the browser', async () => {
    // The nonce is what proves a return-page callback is genuine. Publishing it
    // would let anyone who saw the response forge one.
    sessions.findById.mockResolvedValue(makeSession());

    const view = await service.findOwned('user-1', 'cs-1');

    expect(JSON.stringify(view)).not.toContain('nonce-value');
  });
});
