import { ReconciliationClassification } from '../../../common/enums/reconciliation.enum';
import type {
  ClassifiedGatewayResult,
  PaymobMismatch,
  PaypalMismatch,
} from '../types/reconciliation.types';
import type { PaymobVerificationResult } from '../../gateways/paymob/types/paymob.types';
import type { PaypalCaptureVerification } from '../../gateways/paypal/types/paypal.types';

export function classifyPaypalResult(result: PaypalCaptureVerification): ClassifiedGatewayResult {
  if (result.verified) {
    return {
      classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
      providerStatus: result.status,
      repairable: true,
      providerTransactionId: result.captureId,
      amountMinor: result.amountMinor,
      currency: result.currency,
    };
  }
  return {
    classification: classifyPaypalMismatch(result.mismatchReason ?? 'NOT_TERMINAL'),
    providerStatus: result.status,
    repairable: false,
    providerTransactionId: result.captureId,
    amountMinor: null,
    currency: null,
  };
}

export function classifyPaymobResult(result: PaymobVerificationResult): ClassifiedGatewayResult {
  if (result.verified) {
    return {
      classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
      providerStatus: 'SUCCESS',
      repairable: true,
      providerTransactionId: result.transactionId,
      amountMinor: result.amountMinor,
      currency: result.currency,
    };
  }
  const mismatch = result.mismatchReason ?? 'PENDING';
  return {
    classification: classifyPaymobMismatch(mismatch),
    providerStatus: mismatch,
    repairable: false,
    providerTransactionId: result.transactionId,
    amountMinor: null,
    currency: null,
  };
}

export function classifyPaypalMismatch(mismatch: PaypalMismatch): ReconciliationClassification {
  switch (mismatch) {
    case 'AMOUNT_MISMATCH':
      return ReconciliationClassification.AMOUNT_MISMATCH;
    case 'CURRENCY_MISMATCH':
      return ReconciliationClassification.CURRENCY_MISMATCH;
    case 'SESSION_MISMATCH':
      return ReconciliationClassification.SESSION_MISMATCH;
    case 'NO_CAPTURE':
    case 'NOT_TERMINAL':
      return ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING;
  }
}

export function classifyPaymobMismatch(mismatch: PaymobMismatch): ReconciliationClassification {
  switch (mismatch) {
    case 'AMOUNT_MISMATCH':
      return ReconciliationClassification.AMOUNT_MISMATCH;
    case 'CURRENCY_MISMATCH':
      return ReconciliationClassification.CURRENCY_MISMATCH;
    case 'SESSION_MISMATCH':
      return ReconciliationClassification.SESSION_MISMATCH;
    case 'REVERSED':
      return ReconciliationClassification.PAYMENT_REVERSED;
    case 'PENDING':
      return ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING;
    case 'HMAC_INVALID':
    case 'NOT_SUCCESSFUL':
      return ReconciliationClassification.PAYMENT_FAILED;
  }
}
