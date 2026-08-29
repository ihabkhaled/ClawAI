import type { BillingErrorCode } from '@claw/shared-types';

/**
 * Thrown when auth-service refuses a PAYG request with a 402.
 *
 * Carries the two numbers the user needs to act on and nothing else: no
 * provider rate, no plan cost ceiling, no margin. Those are internal
 * profitability values and `rules/28-billing-integrity-and-api-contracts.md`
 * keeps them out of every error payload.
 *
 * Call sites map this to a `BusinessException` with
 * `HttpStatus.PAYMENT_REQUIRED` so the frontend can render a credit-specific
 * notice with an "Add credit" action, rather than the "wait until tomorrow"
 * copy a token-quota error deserves.
 */
export class PaygCreditExhaustedError extends Error {
  constructor(
    public readonly errorCode: BillingErrorCode,
    public readonly availableMicroUsd: number,
    public readonly requiredMicroUsd: number | null,
  ) {
    super(`PAYG credit request refused: ${errorCode}`);
    this.name = 'PaygCreditExhaustedError';
  }
}

export function isPaygCreditExhaustedError(error: unknown): error is PaygCreditExhaustedError {
  return error instanceof PaygCreditExhaustedError;
}
