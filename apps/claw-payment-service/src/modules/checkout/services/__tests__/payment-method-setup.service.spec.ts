import { BillingGateway, CheckoutPurpose, CheckoutSessionStatus } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymentMethodSetupService } from '../payment-method-setup.service';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';

const INPUT = {
  userId: 'user-1',
  userEmail: 'user@example.com',
  idempotencyKey: 'setup-idempotency-1',
  consentToStore: true as const,
};

const setupSession = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'setup-1',
  userId: 'user-1',
  purpose: CheckoutPurpose.PAYMENT_METHOD_SETUP,
  status: CheckoutSessionStatus.CREATED,
  gateway: BillingGateway.PAYMOB,
  hostedCheckoutUrl: null,
  expiresAt: new Date('2026-07-28T00:00:00.000Z'),
  ...overrides,
});

describe('PaymentMethodSetupService', () => {
  const sessions = {
    findByIdempotencyKey: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    attachProviderOrder: jest.fn(),
    markFailed: jest.fn(),
  };
  const paymob = {
    createSetupIntention: jest.fn(),
  };
  const runtimeConfig = {
    getPaymobCheckout: jest.fn(),
  };
  let service: PaymentMethodSetupService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYMOB_PUBLIC_KEY: 'pk_test',
      PAYMOB_CURRENCY: 'EGP',
    } as ReturnType<typeof AppConfig.get>);
    sessions.findByIdempotencyKey.mockResolvedValue(null);
    sessions.create.mockResolvedValue(setupSession());
    paymob.createSetupIntention.mockResolvedValue({
      intentionId: 'intention-1',
      providerOrderId: 'provider-order-1',
      clientSecret: 'client-secret',
    });
    runtimeConfig.getPaymobCheckout.mockResolvedValue({
      publicKey: 'pk_test',
      currency: 'EGP',
    });
    service = new PaymentMethodSetupService(
      sessions as unknown as CheckoutSessionRepository,
      paymob as unknown as PaymobAdapter,
      runtimeConfig as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a planless verification-charge session with recorded consent', async () => {
    await service.start(INPUT);

    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: CheckoutPurpose.PAYMENT_METHOD_SETUP,
        gateway: BillingGateway.PAYMOB,
        planId: null,
        planPriceVersionId: null,
        billingInterval: null,
        baseAmountMinor: 10,
        baseCurrency: 'EGP',
        chargeAmountMinor: 10,
        chargeCurrency: 'EGP',
        paymentMethodConsentedAt: expect.any(Date),
      }),
    );
  });

  it('commits the setup session before creating the provider intention', async () => {
    const order: string[] = [];
    sessions.create.mockImplementation(async () => {
      order.push('session');
      return setupSession();
    });
    paymob.createSetupIntention.mockImplementation(async () => {
      order.push('gateway');
      return {
        intentionId: 'intention-1',
        providerOrderId: 'provider-order-1',
        clientSecret: 'client-secret',
      };
    });

    await service.start(INPUT);

    expect(order).toEqual(['session', 'gateway']);
    expect(sessions.attachProviderOrder).toHaveBeenCalledWith(
      'setup-1',
      'provider-order-1',
      expect.any(String),
    );
  });

  it('replays only a setup session for the same idempotency key', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(
      setupSession({ hostedCheckoutUrl: 'https://paymob.test/setup' }),
    );

    await expect(service.start(INPUT)).resolves.toMatchObject({
      id: 'setup-1',
      hostedCheckoutUrl: 'https://paymob.test/setup',
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key already used for a purchase', async () => {
    sessions.findByIdempotencyKey.mockResolvedValue(
      setupSession({ purpose: CheckoutPurpose.NEW_SUBSCRIPTION }),
    );

    await expect(service.start(INPUT)).rejects.toMatchObject({
      code: 'PAYMENT_REFERENCE_MISMATCH',
    });
  });

  it('records a stable failure code when provider setup fails', async () => {
    paymob.createSetupIntention.mockRejectedValue(new Error('provider body with payer details'));

    await expect(service.start(INPUT)).rejects.toThrow('provider body');
    expect(sessions.markFailed).toHaveBeenCalledWith('setup-1', 'GATEWAY_UNAVAILABLE');
  });

  it('returns only an authenticated owner setup session for popup polling', async () => {
    sessions.findById.mockResolvedValue(
      setupSession({
        status: CheckoutSessionStatus.COMPLETED,
        hostedCheckoutUrl: 'https://paymob.test/setup',
      }),
    );

    await expect(service.findOwned('user-1', 'setup-1')).resolves.toMatchObject({
      id: 'setup-1',
      status: CheckoutSessionStatus.COMPLETED,
      hostedCheckoutUrl: 'https://paymob.test/setup',
    });
  });

  it('hides another users setup session from popup polling', async () => {
    sessions.findById.mockResolvedValue(setupSession({ userId: 'another-user' }));

    await expect(service.findOwned('user-1', 'setup-1')).rejects.toMatchObject({
      code: 'CHECKOUT_SESSION_NOT_FOUND',
    });
  });
});
