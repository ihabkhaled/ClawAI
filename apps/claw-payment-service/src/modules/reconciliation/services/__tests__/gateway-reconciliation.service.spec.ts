import { BillingGateway, CheckoutSessionStatus } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationResolution,
} from '../../../../common/enums/reconciliation.enum';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { PaymentActivationService } from '../../../webhooks/services/payment-activation.service';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import { GatewayReconciliationService } from '../gateway-reconciliation.service';
import type { CheckoutSession } from '../../../../generated/prisma';

function checkout(id: string, overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    id,
    userId: 'user-1',
    billingEmail: null,
    purpose: 'NEW_SUBSCRIPTION',
    status: CheckoutSessionStatus.AWAITING_PAYMENT,
    gateway: BillingGateway.PAYPAL,
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'price-1',
    billingInterval: 'MONTHLY',
    baseAmountMinor: 2000,
    baseCurrency: 'USD',
    chargeAmountMinor: 2000,
    chargeCurrency: 'USD',
    fxQuoteId: null,
    fxFinalRateScaled: null,
    idempotencyKey: `checkout:${id}`,
    stateNonce: 'nonce',
    paymentMethodConsentedAt: null,
    providerOrderId: `order:${id}`,
    hostedCheckoutUrl: null,
    subscriptionId: null,
    prorationQuoteId: null,
    expiresAt: new Date('2026-07-25T00:00:00.000Z'),
    verifiedAt: null,
    completedAt: null,
    failureCode: null,
    createdAt: new Date('2026-07-24T00:00:00.000Z'),
    updatedAt: new Date('2026-07-24T00:00:00.000Z'),
    ...overrides,
  };
}

describe('GatewayReconciliationService', () => {
  let sessions: { countExpiredPending: jest.Mock; listExpiredPending: jest.Mock };
  let paypal: { getOrder: jest.Mock };
  let paymob: { fetchTransactionByReference: jest.Mock };
  let activation: { activate: jest.Mock };
  let reconciliation: { recordFinding: jest.Mock };
  let service: GatewayReconciliationService;

  beforeEach(() => {
    sessions = {
      countExpiredPending: jest.fn().mockResolvedValue(1),
      listExpiredPending: jest.fn().mockResolvedValue([checkout('checkout-1')]),
    };
    paypal = {
      getOrder: jest.fn().mockResolvedValue({
        verified: true,
        captureId: 'capture-1',
        status: 'COMPLETED',
        amountMinor: 2000,
        currency: 'USD',
        checkoutSessionId: 'checkout-1',
        mismatchReason: null,
      }),
    };
    paymob = { fetchTransactionByReference: jest.fn() };
    activation = { activate: jest.fn().mockResolvedValue('subscription-1') };
    reconciliation = { recordFinding: jest.fn() };
    service = new GatewayReconciliationService(
      sessions as unknown as CheckoutSessionRepository,
      paypal as unknown as PaypalAdapter,
      paymob as unknown as PaymobAdapter,
      activation as unknown as PaymentActivationService,
      reconciliation as unknown as ReconciliationRepository,
    );
  });

  it('repairs a locally pending checkout only after an authoritative verified read', async () => {
    await expect(service.reconcile('run-1', new Date('2026-07-26T00:00:00.000Z'))).resolves.toEqual(
      {
        scannedCount: 1,
        repairedCount: 1,
        quarantinedCount: 0,
        unprocessedCount: 0,
      },
    );
    expect(activation.activate).toHaveBeenCalledWith({
      checkoutSessionId: 'checkout-1',
      providerTransactionId: 'capture-1',
      amountMinor: 2000,
      currency: 'USD',
      correlationId: 'reconcile:run-1:checkout-1',
    });
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
        resolution: ReconciliationResolution.REPAIRED,
      }),
    );
  });

  it('quarantines a gateway timeout or 5xx without guessing that money moved', async () => {
    paypal.getOrder.mockRejectedValueOnce(new Error('gateway unavailable'));

    const result = await service.reconcile('run-1', new Date('2026-07-26T00:00:00.000Z'));

    expect(result).toMatchObject({ repairedCount: 0, quarantinedCount: 1 });
    expect(activation.activate).not.toHaveBeenCalled();
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.GATEWAY_UNAVAILABLE,
        resolution: ReconciliationResolution.QUARANTINED,
      }),
    );
  });

  it('quarantines a session that has no provider reference', async () => {
    sessions.listExpiredPending.mockResolvedValueOnce([
      checkout('checkout-1', { providerOrderId: null }),
    ]);

    await service.reconcile('run-1', new Date('2026-07-26T00:00:00.000Z'));

    expect(paypal.getOrder).not.toHaveBeenCalled();
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.MISSING_PROVIDER_REFERENCE,
      }),
    );
  });

  it('reports a partial batch instead of hiding remaining work', async () => {
    const candidates = Array.from({ length: 50 }, (_, index) => checkout(`checkout-${index}`));
    sessions.countExpiredPending.mockResolvedValueOnce(75);
    sessions.listExpiredPending.mockResolvedValueOnce(candidates);

    const result = await service.reconcile('run-1', new Date('2026-07-26T00:00:00.000Z'));

    expect(result).toMatchObject({
      scannedCount: 50,
      repairedCount: 50,
      unprocessedCount: 25,
    });
  });

  it('uses the Paymob adapter for Paymob candidates', async () => {
    sessions.listExpiredPending.mockResolvedValueOnce([
      checkout('checkout-1', { gateway: BillingGateway.PAYMOB }),
    ]);
    paymob.fetchTransactionByReference.mockResolvedValueOnce({
      verified: false,
      transactionId: 'transaction-1',
      amountMinor: null,
      currency: null,
      checkoutSessionId: null,
      mismatchReason: 'PENDING',
    });

    await service.reconcile('run-1', new Date('2026-07-26T00:00:00.000Z'));

    expect(paymob.fetchTransactionByReference).toHaveBeenCalledWith(
      'checkout-1',
      expect.objectContaining({ checkoutSessionId: 'checkout-1' }),
    );
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING,
      }),
    );
  });
});
