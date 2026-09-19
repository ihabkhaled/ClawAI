import { HttpStatus } from '@nestjs/common';
import { EntitlementsRequestError } from '@claw/shared-entitlements';

import { BusinessException } from '../errors';

/**
 * The exception to throw when an entitlements lookup fails.
 *
 * A refusal auth-service stated on purpose - `PLAN_TRIAL_EXPIRED`,
 * `PLAN_TRIAL_ALREADY_USED` - is passed through with its own code and status,
 * because the frontend maps that code to the "your free trial has ended"
 * notice. It used to be relabelled ENTITLEMENTS_UNAVAILABLE / 503, so a user
 * whose trial had ended was told the service was down.
 *
 * Anything else genuinely is "could not find out", and stays a 503.
 */
export function toEntitlementsException(error: unknown): BusinessException {
  if (error instanceof EntitlementsRequestError) {
    return new BusinessException(error.message, error.errorCode, error.status as HttpStatus);
  }
  return new BusinessException(
    'Entitlements are temporarily unavailable',
    'ENTITLEMENTS_UNAVAILABLE',
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
