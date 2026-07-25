import { HttpStatus } from '@nestjs/common';
import type { BillingErrorCode } from '@claw/shared-types';

import { BusinessException } from './business.exception';

// Every billing failure surfaces as a stable BillingErrorCode plus an i18n key.
//
// `details` is deliberately narrow: it may carry identifiers the caller already
// owns (their own plan slug, their own subscription id) but never a provider
// payload, a gateway error body, a secret identifier, or a cost-budget figure.
export class BillingException extends BusinessException {
  constructor(
    code: BillingErrorCode,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super(`billing.errors.${code}`, code, status, details);
  }
}
