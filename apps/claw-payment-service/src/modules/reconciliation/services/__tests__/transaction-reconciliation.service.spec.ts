import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
} from '../../../../common/enums/reconciliation.enum';
import type { PaymentTransactionRepository } from '../../../billing/repositories/payment-transaction.repository';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import { TransactionReconciliationService } from '../transaction-reconciliation.service';
import { transactionFixture } from './reconciliation.fixture';

describe('TransactionReconciliationService', () => {
  let transactions: {
    countNonTerminalForReconciliation: jest.Mock;
    listNonTerminalForReconciliation: jest.Mock;
  };
  let paypal: { getOrder: jest.Mock };
  let reconciliation: { recordFinding: jest.Mock };
  let service: TransactionReconciliationService;

  beforeEach(() => {
    transactions = {
      countNonTerminalForReconciliation: jest.fn().mockResolvedValue(1),
      listNonTerminalForReconciliation: jest.fn().mockResolvedValue([transactionFixture()]),
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
    reconciliation = { recordFinding: jest.fn() };
    service = new TransactionReconciliationService(
      transactions as unknown as PaymentTransactionRepository,
      paypal as unknown as PaypalAdapter,
      { fetchTransaction: jest.fn() } as unknown as PaymobAdapter,
      reconciliation as unknown as ReconciliationRepository,
    );
  });

  it('pulls authoritative state but quarantines an append-only ambiguous ledger row', async () => {
    const result = await service.reconcile('run-1');

    expect(result).toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 1,
      unprocessedCount: 0,
    });
    expect(paypal.getOrder).toHaveBeenCalledTimes(1);
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: ReconciliationEntityType.PAYMENT_TRANSACTION,
        classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
        resolution: ReconciliationResolution.QUARANTINED,
      }),
    );
  });

  it('records a gateway failure without persisting the provider body', async () => {
    paypal.getOrder.mockRejectedValueOnce(new Error('private provider response'));

    await service.reconcile('run-1');

    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: ReconciliationClassification.GATEWAY_UNAVAILABLE,
        providerStatus: null,
      }),
    );
  });

  it('reports the non-terminal transaction backlog beyond the bounded batch', async () => {
    transactions.countNonTerminalForReconciliation.mockResolvedValueOnce(60);

    await expect(service.reconcile('run-1')).resolves.toMatchObject({
      scannedCount: 1,
      unprocessedCount: 59,
    });
  });
});
