import { BillingGateway, SubscriptionStatus } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationResolution,
} from '../../../../common/enums/reconciliation.enum';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { SubscriptionRepository } from '../../../subscriptions/repositories/subscription.repository';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import type { GatewaySubscriptionVaultService } from '../gateway-subscription-vault.service';
import { ProviderSubscriptionReconciliationService } from '../provider-subscription-reconciliation.service';
import { subscriptionFixture } from './reconciliation.fixture';

describe('ProviderSubscriptionReconciliationService', () => {
  let subscriptions: {
    countProviderBoundNonTerminal: jest.Mock;
    findProviderBoundNonTerminal: jest.Mock;
  };
  let paypal: { getSubscription: jest.Mock };
  let reconciliation: { recordFinding: jest.Mock };
  let service: ProviderSubscriptionReconciliationService;

  beforeEach(() => {
    subscriptions = {
      countProviderBoundNonTerminal: jest.fn().mockResolvedValue(1),
      findProviderBoundNonTerminal: jest.fn().mockResolvedValue([subscriptionFixture()]),
    };
    paypal = {
      getSubscription: jest.fn().mockResolvedValue({
        subscriptionId: 'provider-1',
        status: 'ACTIVE',
        isActive: true,
        nextBillingTime: '2026-08-01T00:00:00.000Z',
        checkoutSessionId: 'checkout-1',
      }),
    };
    reconciliation = { recordFinding: jest.fn() };
    service = new ProviderSubscriptionReconciliationService(
      subscriptions as unknown as SubscriptionRepository,
      paypal as unknown as PaypalAdapter,
      {
        decrypt: jest.fn().mockReturnValue('provider-1'),
      } as unknown as GatewaySubscriptionVaultService,
      reconciliation as unknown as ReconciliationRepository,
    );
  });

  it('does not invent a divergence when local and provider state agree', async () => {
    await expect(service.reconcile('run-1')).resolves.toMatchObject({
      scannedCount: 1,
      quarantinedCount: 0,
    });
    expect(reconciliation.recordFinding).not.toHaveBeenCalled();
  });

  it('quarantines a past-due local subscription that the provider reports active', async () => {
    subscriptions.findProviderBoundNonTerminal.mockResolvedValueOnce([
      subscriptionFixture({ status: SubscriptionStatus.PAST_DUE }),
    ]);

    await service.reconcile('run-1');

    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.LOCAL_PAST_DUE_PROVIDER_ACTIVE,
        resolution: ReconciliationResolution.QUARANTINED,
      }),
    );
  });

  it('quarantines a gateway without a provider subscription read API', async () => {
    subscriptions.findProviderBoundNonTerminal.mockResolvedValueOnce([
      subscriptionFixture({ gateway: BillingGateway.PAYMOB }),
    ]);

    await service.reconcile('run-1');

    expect(paypal.getSubscription).not.toHaveBeenCalled();
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.UNSUPPORTED_GATEWAY,
      }),
    );
  });

  it('classifies provider inactivity rather than revoking a paid period early', async () => {
    paypal.getSubscription.mockResolvedValueOnce({
      subscriptionId: 'provider-1',
      status: 'CANCELLED',
      isActive: false,
      nextBillingTime: null,
      checkoutSessionId: 'checkout-1',
    });

    await service.reconcile('run-1');

    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.LOCAL_ACTIVE_PROVIDER_INACTIVE,
      }),
    );
  });
});
