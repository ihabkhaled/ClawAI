import { Injectable, Logger } from '@nestjs/common';
import { BillingGateway } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
} from '../../../common/enums/reconciliation.enum';
import { PaymentTransactionRepository } from '../../billing/repositories/payment-transaction.repository';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { RECONCILIATION_BATCH_SIZE } from '../constants/reconciliation.constants';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import {
  classifyPaymobResult,
  classifyPaypalResult,
} from '../utilities/gateway-classification.utility';
import type { ReconciliationTransactionCandidate } from '../../billing/types/billing-reconciliation.types';
import type { ClassifiedGatewayResult, ReconciliationCounts } from '../types/reconciliation.types';

@Injectable()
export class TransactionReconciliationService {
  private readonly logger = new Logger(TransactionReconciliationService.name);

  constructor(
    private readonly transactions: PaymentTransactionRepository,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
    private readonly reconciliation: ReconciliationRepository,
  ) {}

  async reconcile(runId: string): Promise<ReconciliationCounts> {
    const total = await this.transactions.countNonTerminalForReconciliation();
    const candidates =
      await this.transactions.listNonTerminalForReconciliation(RECONCILIATION_BATCH_SIZE);
    for (const candidate of candidates) {
      await this.reconcileOne(runId, candidate);
    }
    return {
      scannedCount: candidates.length,
      repairedCount: 0,
      quarantinedCount: candidates.length,
      unprocessedCount: Math.max(0, total - candidates.length),
    };
  }

  private async reconcileOne(
    runId: string,
    candidate: ReconciliationTransactionCandidate,
  ): Promise<void> {
    if (candidate.checkoutSession === null) {
      await this.record(
        runId,
        candidate,
        ReconciliationClassification.MISSING_PROVIDER_REFERENCE,
        null,
      );
      return;
    }
    try {
      const result = await this.readGateway(candidate);
      await this.record(runId, candidate, result.classification, result.providerStatus);
    } catch {
      this.logger.error(`reconcileOne: gateway read failed transaction=${candidate.id}`);
      await this.record(runId, candidate, ReconciliationClassification.GATEWAY_UNAVAILABLE, null);
    }
  }

  private async readGateway(
    candidate: ReconciliationTransactionCandidate,
  ): Promise<ClassifiedGatewayResult> {
    const session = candidate.checkoutSession;
    if (session === null) {
      return TransactionReconciliationService.unsupported();
    }
    const expected = {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    };
    if (candidate.gateway === BillingGateway.PAYPAL && candidate.providerOrderId !== null) {
      return classifyPaypalResult(await this.paypal.getOrder(candidate.providerOrderId, expected));
    }
    if (candidate.gateway === BillingGateway.PAYMOB && candidate.providerTransactionId !== null) {
      return classifyPaymobResult(
        await this.paymob.fetchTransaction(candidate.providerTransactionId, expected),
      );
    }
    return TransactionReconciliationService.unsupported();
  }

  private async record(
    runId: string,
    candidate: ReconciliationTransactionCandidate,
    classification: ReconciliationClassification,
    providerStatus: string | null,
  ): Promise<void> {
    await this.reconciliation.recordFinding({
      runId,
      entityType: ReconciliationEntityType.PAYMENT_TRANSACTION,
      entityId: candidate.id,
      gateway: candidate.gateway,
      classification,
      localStatus: candidate.status,
      providerStatus,
      // A non-terminal ledger row is never rewritten from an ambiguous read.
      // Checkout reconciliation separately activates fully verified money.
      resolution: ReconciliationResolution.QUARANTINED,
      repairedAt: null,
    });
  }

  private static unsupported(): ClassifiedGatewayResult {
    return {
      classification: ReconciliationClassification.MISSING_PROVIDER_REFERENCE,
      providerStatus: 'UNSUPPORTED_REFERENCE',
      repairable: false,
      providerTransactionId: null,
      amountMinor: null,
      currency: null,
    };
  }
}
