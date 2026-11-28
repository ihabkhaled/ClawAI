import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

import { COUNTED_SIGNAL_CODES } from '../constants/abuse-defense.constants';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseThresholds, CountedAbuseSignalCode } from '../types/abuse-defense.types';

/**
 * What an exception thrown for an AUTHENTICATED request says about the account that
 * sent it, or null when it says nothing.
 *
 * - 429 from any HTTP exception: the account's own token spent its own budget (the global
 *   throttler keys an authenticated request on its user id, never on a shared address).
 * - 403 from Nest's plain ForbiddenException: a role or permission guard refused the token.
 *   A BusinessException with status 403 is a domain refusal (self-ban, super-admin invariant,
 *   a banned account) and is NOT a probe, so it is not an instance of ForbiddenException.
 * Everything else, 401 included, is null: a missing or bad credential is not an
 * authenticated account's behaviour, and a failed sign-in is the ATTACKER's act, never
 * the targeted account's (ADR-233).
 */
export function classifyAbuseSignal(exception: unknown, status: number): AbuseSignalCode | null {
  if (status === HttpStatus.TOO_MANY_REQUESTS && exception instanceof HttpException) {
    return AbuseSignalCode.RATE_LIMIT_TRIPPED;
  }
  if (status === HttpStatus.FORBIDDEN && exception instanceof ForbiddenException) {
    return AbuseSignalCode.FORBIDDEN_PROBE;
  }
  return null;
}

/** Whether a code can suspend an account; the rest are evidence for an administrator only. */
export function isCountedSignalCode(code: AbuseSignalCode): code is CountedAbuseSignalCode {
  return COUNTED_SIGNAL_CODES.includes(code);
}

/** The window threshold of one counted code. A switch, not a dynamic key: every code is named. */
export function thresholdFor(thresholds: AbuseThresholds, code: CountedAbuseSignalCode): number {
  switch (code) {
    case AbuseSignalCode.RATE_LIMIT_TRIPPED:
      return thresholds[AbuseSignalCode.RATE_LIMIT_TRIPPED];
    case AbuseSignalCode.FORBIDDEN_PROBE:
      return thresholds[AbuseSignalCode.FORBIDDEN_PROBE];
    case AbuseSignalCode.SSRF_REFUSED:
      return thresholds[AbuseSignalCode.SSRF_REFUSED];
  }
}
