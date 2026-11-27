import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import {
  BOT_CHECK_FAILED_MESSAGE,
  BOT_CHECK_REQUIRED_MESSAGE,
  DISPOSABLE_EMAIL_MESSAGE,
  EMAIL_DOMAIN_UNDELIVERABLE_MESSAGE,
  EMAIL_FIELD,
  SIGNUP_LIMITED_MESSAGE,
} from '../constants/anti-abuse.constants';
import { AntiAbuseErrorCode } from '../enums/anti-abuse-error-code.enum';
import { BotCheckOutcome } from '../enums/bot-check-outcome.enum';
import { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';

/** REQUIRED -> 428 BOT_CHECK_REQUIRED; anything else that did not pass -> 403 BOT_CHECK_FAILED. */
export function botCheckRefusal(outcome: BotCheckOutcome): BusinessException {
  return outcome === BotCheckOutcome.REQUIRED
    ? new BusinessException(
        BOT_CHECK_REQUIRED_MESSAGE,
        AntiAbuseErrorCode.BOT_CHECK_REQUIRED,
        HttpStatus.PRECONDITION_REQUIRED,
      )
    : new BusinessException(
        BOT_CHECK_FAILED_MESSAGE,
        AntiAbuseErrorCode.BOT_CHECK_FAILED,
        HttpStatus.FORBIDDEN,
      );
}

/** DISPOSABLE -> DISPOSABLE_EMAIL, otherwise EMAIL_DOMAIN_UNDELIVERABLE; both 400 on `email`. */
export function emailDomainRefusal(verdict: EmailDomainVerdict): BusinessException {
  const disposable = verdict === EmailDomainVerdict.DISPOSABLE;
  return new BusinessException(
    disposable ? DISPOSABLE_EMAIL_MESSAGE : EMAIL_DOMAIN_UNDELIVERABLE_MESSAGE,
    disposable
      ? AntiAbuseErrorCode.DISPOSABLE_EMAIL
      : AntiAbuseErrorCode.EMAIL_DOMAIN_UNDELIVERABLE,
    HttpStatus.BAD_REQUEST,
    { field: EMAIL_FIELD },
  );
}

/** 429 SIGNUP_TEMPORARILY_LIMITED; the filter sends `retryAfterSeconds` as Retry-After. */
export function signupLimitedRefusal(retryAfterSeconds: number): BusinessException {
  return new BusinessException(
    SIGNUP_LIMITED_MESSAGE,
    AntiAbuseErrorCode.SIGNUP_TEMPORARILY_LIMITED,
    HttpStatus.TOO_MANY_REQUESTS,
    { retryAfterSeconds },
  );
}
