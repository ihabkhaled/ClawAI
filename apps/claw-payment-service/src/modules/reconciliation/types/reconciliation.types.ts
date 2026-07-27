import type {
  PaymobMismatchReason,
  PaymobVerificationResult,
} from '../../gateways/paymob/types/paymob.types';
import type {
  PaypalCaptureVerification,
  PaypalMismatchReason,
} from '../../gateways/paypal/types/paypal.types';
import type {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
  ReconciliationRunStatus,
} from '../../../common/enums/reconciliation.enum';

export type ReconciliationCounts = {
  scannedCount: number;
  repairedCount: number;
  quarantinedCount: number;
  unprocessedCount: number;
};

export type ReconciliationFindingInput = {
  runId: string;
  entityType: ReconciliationEntityType;
  entityId: string;
  gateway: string;
  classification: ReconciliationClassification;
  localStatus: string;
  providerStatus: string | null;
  resolution: ReconciliationResolution;
  repairedAt: Date | null;
};

export type CompleteReconciliationRunInput = ReconciliationCounts & {
  runId: string;
  status: ReconciliationRunStatus;
  errorCode: string | null;
};

export type ClassifiedGatewayResult = {
  classification: ReconciliationClassification;
  providerStatus: string;
  repairable: boolean;
  providerTransactionId: string | null;
  amountMinor: number | null;
  currency: string | null;
};

export type GatewayReconciliationResult =
  | { repaired: true; classification: ReconciliationClassification; providerStatus: string }
  | {
      repaired: false;
      classification: ReconciliationClassification;
      providerStatus: string | null;
    };

export type PaypalMismatch = Exclude<PaypalMismatchReason, null>;
export type PaymobMismatch = Exclude<PaymobMismatchReason, null>;
export type GatewayVerification = PaypalCaptureVerification | PaymobVerificationResult;
