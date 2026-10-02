import { RATE_LIMIT_COPY_KEYS } from '@/constants/rate-limit.constants';
import {
  NETWORK_FAILURE_STATUS,
  PASSWORD_RULES,
  REGISTER_FIELD_FALLBACK_KEYS,
  REGISTER_ISSUE_MESSAGE_KEYS,
  SIGNUP_HTTP_BAD_REQUEST,
  SIGNUP_HTTP_TOO_MANY_REQUESTS,
} from '@/constants/register.constants';
import { ApiErrorCode } from '@/enums/api-error-code.enum';
import { RegisterValidationIssue } from '@/enums/register-validation-issue.enum';
import { SignupFailureReason } from '@/enums/signup-failure-reason.enum';
import type {
  PasswordRuleState,
  SignupErrorShape,
  RegisterServerField,
  SignupFailureCopy,
  SignupFieldError,
} from '@/types';

import { resolveRateLimitMessage } from './rate-limit.utility';

function readErrorShape(error: unknown): SignupErrorShape {
  if (error === null || typeof error !== 'object') {
    return { code: null, status: null, errors: null, requestId: null };
  }
  const candidate = error as Record<string, unknown>;
  const errors = candidate['errors'];
  return {
    code: typeof candidate['code'] === 'string' ? candidate['code'] : null,
    status: typeof candidate['status'] === 'number' ? candidate['status'] : null,
    errors:
      errors !== null && typeof errors === 'object' ? (errors as Record<string, unknown>) : null,
    requestId:
      typeof candidate['requestId'] === 'string' && candidate['requestId'].length > 0
        ? candidate['requestId']
        : null,
  };
}

/**
 * Map a failed sign-up to the one reason the form explains.
 *
 * Anything unrecognised is UNKNOWN, never the most likely guess: telling
 * somebody their details are wrong when the real cause was a 502 sends them to
 * edit a form that was fine (rule 43 §2).
 */
export function classifySignupFailure(error: unknown): SignupFailureReason {
  const { code, status, errors } = readErrorShape(error);
  switch (code) {
    case ApiErrorCode.DUPLICATE_ENTITY:
      return SignupFailureReason.EMAIL_TAKEN;
    case ApiErrorCode.VALIDATION_FAILED:
    case ApiErrorCode.WEAK_PASSWORD:
      return SignupFailureReason.INVALID_DETAILS;
    case ApiErrorCode.RATE_LIMITED:
      return SignupFailureReason.RATE_LIMITED;
    case ApiErrorCode.SIGNUP_PLAN_ASSIGNMENT_FAILED:
      return SignupFailureReason.ACCOUNT_SETUP_FAILED;
    default:
      break;
  }
  if (status === SIGNUP_HTTP_TOO_MANY_REQUESTS) {
    return SignupFailureReason.RATE_LIMITED;
  }
  if (status === NETWORK_FAILURE_STATUS) {
    return SignupFailureReason.NETWORK;
  }
  if (status === SIGNUP_HTTP_BAD_REQUEST && errors !== null) {
    return SignupFailureReason.INVALID_DETAILS;
  }
  return SignupFailureReason.UNKNOWN;
}

/** The i18n keys for one sign-up failure, and which ways out it offers. */
export function resolveSignupFailureCopy(
  reason: SignupFailureReason,
  retryAfterSeconds: number | null = null,
): SignupFailureCopy {
  switch (reason) {
    case SignupFailureReason.EMAIL_TAKEN:
      return {
        titleKey: 'auth.signup.emailTakenTitle',
        descriptionKey: 'auth.signup.emailTakenDescription',
        offersSignIn: true,
        showsRequestId: false,
      };
    case SignupFailureReason.INVALID_DETAILS:
      return {
        titleKey: 'auth.signup.invalidDetailsTitle',
        descriptionKey: 'auth.signup.invalidDetailsDescription',
        offersSignIn: false,
        showsRequestId: false,
      };
    case SignupFailureReason.RATE_LIMITED: {
      // "Try again in N minutes" from the server's Retry-After; the old
      // "wait a minute" copy only when no header came back.
      const message = resolveRateLimitMessage(retryAfterSeconds);
      return {
        titleKey: RATE_LIMIT_COPY_KEYS.title,
        descriptionKey: message.key,
        descriptionParams: message.params,
        offersSignIn: false,
        showsRequestId: false,
      };
    }
    case SignupFailureReason.ACCOUNT_SETUP_FAILED:
      return {
        titleKey: 'auth.signup.accountSetupFailedTitle',
        descriptionKey: 'auth.signup.accountSetupFailedDescription',
        offersSignIn: false,
        showsRequestId: true,
      };
    case SignupFailureReason.NETWORK:
      return {
        titleKey: 'auth.signup.networkTitle',
        descriptionKey: 'auth.signup.networkDescription',
        offersSignIn: false,
        showsRequestId: false,
      };
    case SignupFailureReason.UNKNOWN:
      return {
        titleKey: 'auth.signup.unknownTitle',
        descriptionKey: 'auth.signup.unknownDescription',
        offersSignIn: false,
        showsRequestId: true,
      };
  }
}

function isServerField(field: string): field is RegisterServerField {
  return Object.hasOwn(REGISTER_FIELD_FALLBACK_KEYS, field);
}

function isKnownIssue(value: unknown): value is RegisterValidationIssue {
  return (
    typeof value === 'string' && Object.values<string>(RegisterValidationIssue).includes(value)
  );
}

/**
 * The field-level problems the API reported, each mapped to translated copy for
 * that field. WEAK_PASSWORD (the manager's defence-in-depth check) has no field
 * map, so it is pinned to `password` here.
 */
export function resolveSignupFieldErrors(error: unknown): SignupFieldError[] {
  const { code, errors } = readErrorShape(error);
  if (code === ApiErrorCode.WEAK_PASSWORD) {
    return [{ field: 'password', messageKey: REGISTER_FIELD_FALLBACK_KEYS.password }];
  }
  if (errors === null) {
    return [];
  }
  const fieldErrors: SignupFieldError[] = [];
  for (const [field, issues] of Object.entries(errors)) {
    if (!isServerField(field)) {
      continue;
    }
    const first: unknown = Array.isArray(issues) ? issues[0] : undefined;
    fieldErrors.push({
      field,
      messageKey: isKnownIssue(first)
        ? REGISTER_ISSUE_MESSAGE_KEYS[first]
        : REGISTER_FIELD_FALLBACK_KEYS[field],
    });
  }
  return fieldErrors;
}

/** The response's request reference, when the server sent one. */
export function readSignupRequestId(error: unknown): string | null {
  return readErrorShape(error).requestId;
}

/** Each password rule with whether the typed password already meets it. */
export function evaluatePasswordRules(password: string): PasswordRuleState[] {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    labelKey: rule.labelKey,
    isMet: rule.pattern.test(password),
  }));
}
