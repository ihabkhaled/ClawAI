import { Injectable, Logger } from '@nestjs/common';
import { BillingGateway } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
} from '../../../common/enums/reconciliation.enum';
import { CheckoutSessionRepository } from '../../billing/repositories/checkout-session.repository';
import { PaymobAdapter } from '../../gateways/paymob/paymob.adapter';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { PaymentActivationService } from '../../webhooks/services/payment-activation.service';
import { RECONCILIATION_BATCH_SIZE } from '../constants/reconciliation.constants';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import {
  classifyPaymobResult,
  classifyPaypalResult,
} from '../utilities/gateway-classification.utility';
import type { CheckoutSession } from '../../../generated/prisma';
import type {
  ClassifiedGatewayResult,
  GatewayReconciliationResult,
  ReconciliationCounts,
} from '../types/reconciliation.types';

@Injectable()
export class GatewayReconciliationService {
  private readonly logger = new Logger(GatewayReconciliationService.name);

  constructor(
    private readonly sessions: CheckoutSessionRepository,
    private readonly paypal: PaypalAdapter,
    private readonly paymob: PaymobAdapter,
    private readonly activation: PaymentActivationService,
    private readonly reconciliation: ReconciliationRepository,
  ) {}

  async reconcile(runId: string, now: Date): Promise<ReconciliationCounts> {
    const total = await this.sessions.countExpiredPending(now.getTime());
    const candidates = await this.sessions.listExpiredPending(
      now.getTime(),
      RECONCILIATION_BATCH_SIZE,
    );
    let repairedCount = 0;
    let quarantinedCount = 0;
    for (const session of candidates) {
      const result = await this.reconcileOne(runId, session);
      repairedCount += result.repaired ? 1 : 0;
      quarantinedCount += result.repaired ? 0 : 1;
    }
    return {
      scannedCount: candidates.length,
      repairedCount,
      quarantinedCount,
      unprocessedCount: Math.max(0, total - candidates.length),
    };
  }

  private async reconcileOne(
    runId: string,
    session: CheckoutSession,
  ): Promise<GatewayReconciliationResult> {
    if (session.providerOrderId === null) {
      return this.quarantine(
        runId,
        session,
        ReconciliationClassification.MISSING_PROVIDER_REFERENCE,
        null,
      );
    }
    try {
      const result = await this.readGateway(session);
      if (!result.repairable) {
        return await this.quarantine(runId, session, result.classification, result.providerStatus);
      }
      return await this.repair(runId, session, result);
    } catch {
      this.logger.error(`reconcileOne: gateway read failed session=${session.id}`);
      return this.quarantine(
        runId,
        session,
        ReconciliationClassification.GATEWAY_UNAVAILABLE,
        null,
      );
    }
  }

  private async readGateway(session: CheckoutSession): Promise<ClassifiedGatewayResult> {
    const expected = {
      amountMinor: session.chargeAmountMinor,
      currency: session.chargeCurrency,
      checkoutSessionId: session.id,
    };
    if (session.gateway === BillingGateway.PAYPAL) {
      const result = await this.paypal.getOrder(session.providerOrderId ?? '', expected);
      return classifyPaypalResult(result);
    }
    if (session.gateway === BillingGateway.PAYMOB) {
      const result = await this.paymob.fetchTransaction(session.providerOrderId ?? '', expected);
      return classifyPaymobResult(result);
    }
    return {
      classification: ReconciliationClassification.UNSUPPORTED_GATEWAY,
      providerStatus: 'UNSUPPORTED',
      repairable: false,
      providerTransactionId: null,
      amountMinor: null,
      currency: null,
    };
  }

  private async repair(
    runId: string,
    session: CheckoutSession,
    result: ClassifiedGatewayResult,
  ): Promise<GatewayReconciliationResult> {
    if (
      result.providerTransactionId === null ||
      result.amountMinor === null ||
      result.currency === null
    ) {
      return this.quarantine(
        runId,
        session,
        ReconciliationClassification.PAYMENT_FAILED,
        result.providerStatus,
      );
    }
    await this.activation.activate({
      checkoutSessionId: session.id,
      providerTransactionId: result.providerTransactionId,
      amountMinor: result.amountMinor,
      currency: result.currency,
      correlationId: `reconcile:${runId}:${session.id}`,
    });
    await this.record(
      runId,
      session,
      result.classification,
      result.providerStatus,
      ReconciliationResolution.REPAIRED,
    );
    return {
      repaired: true,
      classification: result.classification,
      providerStatus: result.providerStatus,
    };
  }

  private async quarantine(
    runId: string,
    session: CheckoutSession,
    classification: ReconciliationClassification,
    providerStatus: string | null,
  ): Promise<GatewayReconciliationResult> {
    await this.record(
      runId,
      session,
      classification,
      providerStatus,
      ReconciliationResolution.QUARANTINED,
    );
    return { repaired: false, classification, providerStatus };
  }

  private async record(
    runId: string,
    session: CheckoutSession,
    classification: ReconciliationClassification,
    providerStatus: string | null,
    resolution: ReconciliationResolution,
  ): Promise<void> {
    await this.reconciliation.recordFinding({
      runId,
      entityType: ReconciliationEntityType.CHECKOUT_SESSION,
      entityId: session.id,
      gateway: session.gateway,
      classification,
      localStatus: session.status,
      providerStatus,
      resolution,
      repairedAt: resolution === ReconciliationResolution.REPAIRED ? new Date() : null,
    });
  }
}
