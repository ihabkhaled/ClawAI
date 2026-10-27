import { ThreadFailureClass, ThreadFailureRemedy } from '@claw/shared-types';

import type { FailureClassInfo } from '../types/failure-classification.types';

/** Machine code of a step -> why it failed. Codes not listed fall to the status or pattern rules. */
export const FAILURE_CLASS_BY_CODE: ReadonlyMap<string, ThreadFailureClass> = new Map([
  ['PROVIDER_RATE_LIMITED', ThreadFailureClass.PROVIDER_RATE_LIMITED],
  ['PROVIDER_UNAVAILABLE', ThreadFailureClass.PROVIDER_UNAVAILABLE],
  ['CLOUD_PROVIDER_UNAVAILABLE', ThreadFailureClass.PROVIDER_UNAVAILABLE],
  ['CLOUD_PROVIDER_ERROR', ThreadFailureClass.PROVIDER_UNAVAILABLE],
  ['CLOUD_PROVIDER_REQUEST_FAILED', ThreadFailureClass.PROVIDER_REJECTED],
  ['CLOUD_PROVIDER_EMPTY_RESPONSE', ThreadFailureClass.EMPTY_OUTPUT],
  ['MODEL_IDLE_TIMEOUT', ThreadFailureClass.PROVIDER_TIMEOUT],
  ['MODEL_HARD_CEILING', ThreadFailureClass.PROVIDER_TIMEOUT],
  ['GENERATION_ATTEMPT_TIMEOUT', ThreadFailureClass.PROVIDER_TIMEOUT],
  ['MODEL_REASONED_NO_ANSWER', ThreadFailureClass.EMPTY_OUTPUT],
  ['OUTPUT_INVALID', ThreadFailureClass.WRONG_SHAPE],
  ['CITATION_INVALID', ThreadFailureClass.CITATION_RULE],
  ['CONTEXT_WINDOW_EXCEEDED', ThreadFailureClass.CONTEXT_OVERFLOW],
  ['CONTEXT_WINDOW_ASSUMED', ThreadFailureClass.CONTEXT_OVERFLOW],
  ['PROVIDER_REQUEST_TOO_LARGE', ThreadFailureClass.CONTEXT_OVERFLOW],
  ['MODEL_CATALOG_UNREACHABLE', ThreadFailureClass.PROVIDER_UNAVAILABLE],
  ['MODEL_CATALOG_REJECTED', ThreadFailureClass.PROVIDER_REJECTED],
  ['PAYG_PRICE_UNAVAILABLE', ThreadFailureClass.PRICING_UNAVAILABLE],
  ['PAYG_PRICING_UNAVAILABLE', ThreadFailureClass.PRICING_UNAVAILABLE],
  ['PAYG_MODEL_UNPRICED', ThreadFailureClass.PRICING_UNAVAILABLE],
  ['PAYG_CAP_TOO_LOW', ThreadFailureClass.CAP_TOO_LOW],
  ['PAYG_CREDIT_EXHAUSTED', ThreadFailureClass.CREDIT_EXHAUSTED],
  ['PAYG_FREE_ALLOWANCE_EXHAUSTED', ThreadFailureClass.CREDIT_EXHAUSTED],
  ['PROVIDER_CREDIT_EXHAUSTED', ThreadFailureClass.PROVIDER_CREDIT],
  ['RESEARCH_FAILED', ThreadFailureClass.RESEARCH_FAILED],
  ['RESEARCH_EMPTY', ThreadFailureClass.RESEARCH_FAILED],
  ['RESEARCH_UNAVAILABLE', ThreadFailureClass.RESEARCH_FAILED],
  ['REVIEW_NOT_PASSED', ThreadFailureClass.REVIEW_NOT_PASSED],
  ['EVIDENCE_GAP', ThreadFailureClass.EVIDENCE_GAP],
  ['JUDGE_SCORE_LOW', ThreadFailureClass.REVIEW_NOT_PASSED],
  ['CRITIC_SCORE_LOW', ThreadFailureClass.REVIEW_NOT_PASSED],
  ['CONSENSUS_NOT_REACHED', ThreadFailureClass.REVIEW_NOT_PASSED],
  ['QUEUE_EXPIRED', ThreadFailureClass.QUEUE_WORKER],
  ['LEASE_EXPIRED', ThreadFailureClass.QUEUE_WORKER],
  ['GENERATION_WORKER_LOST', ThreadFailureClass.QUEUE_WORKER],
  ['CANCELLED', ThreadFailureClass.CANCELLED],
]);

/** Codes a provider or the gateway uses to say a safety or content policy stopped the reply. */
export const REFUSAL_CODE_PATTERN =
  /(?:SAFETY|CONTENT_FILTER|CONTENT_POLICY|CONTENT_BLOCKED|PROHIBITED|MODERATION|REFUSED)/u;

/** Codes that mean the account or plan may not use this model. */
export const ENTITLEMENT_CODE_PATTERN = /(?:NOT_IN_PLAN|NOT_ALLOWED|FORBIDDEN|FEATURE_DISABLED)/u;

export const HTTP_STATUS_RATE_LIMITED = 429;
export const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413;
export const HTTP_STATUS_PAYMENT_REQUIRED = 402;
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_FORBIDDEN = 403;
export const HTTP_STATUS_CLIENT_ERROR_MIN = 400;
export const HTTP_STATUS_SERVER_ERROR_MIN = 500;
export const HTTP_STATUS_TIMEOUTS: ReadonlySet<number> = new Set([408, 504, 522, 524]);

/** The code the gateway reports for an error it could not name. */
export const GENERIC_PROVIDER_ERROR_CODE = 'PROVIDER_ERROR';

const CHOOSE_MODEL_REMEDIES: readonly ThreadFailureRemedy[] = [
  ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
  ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
  ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
];

const TRANSIENT_REMEDIES: readonly ThreadFailureRemedy[] = [
  ThreadFailureRemedy.TRY_AGAIN,
  ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
  ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
];

const HEALED_BY_MODEL: FailureClassInfo = {
  healable: true,
  ownerOnly: false,
  retryable: true,
  remedies: CHOOSE_MODEL_REMEDIES,
};

const HEALED_BY_WAITING: FailureClassInfo = { ...HEALED_BY_MODEL, remedies: TRANSIENT_REMEDIES };

const PLAIN_RETRY: FailureClassInfo = {
  healable: false,
  ownerOnly: false,
  retryable: true,
  remedies: [ThreadFailureRemedy.TRY_AGAIN],
};

/**
 * What each failure class means for the ladder and the panel (ADR-181). `ownerOnly` stops the
 * ladder at once: no change on this side can help, so another model would be refused the same way.
 */
export const FAILURE_CLASS_INFO: ReadonlyMap<ThreadFailureClass, FailureClassInfo> = new Map([
  [ThreadFailureClass.PROVIDER_REJECTED, HEALED_BY_MODEL],
  [ThreadFailureClass.PROVIDER_RATE_LIMITED, HEALED_BY_WAITING],
  [ThreadFailureClass.PROVIDER_UNAVAILABLE, HEALED_BY_WAITING],
  [ThreadFailureClass.PROVIDER_TIMEOUT, HEALED_BY_WAITING],
  [ThreadFailureClass.NETWORK, HEALED_BY_WAITING],
  [ThreadFailureClass.PROVIDER_CREDIT, HEALED_BY_MODEL],
  [ThreadFailureClass.EMPTY_OUTPUT, HEALED_BY_MODEL],
  [
    ThreadFailureClass.TRUNCATED_OUTPUT,
    {
      ...HEALED_BY_MODEL,
      remedies: [
        ThreadFailureRemedy.SHORTER_ARTICLE,
        ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
        ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
      ],
    },
  ],
  [ThreadFailureClass.INVALID_JSON, HEALED_BY_MODEL],
  [ThreadFailureClass.WRONG_SHAPE, HEALED_BY_MODEL],
  [ThreadFailureClass.CITATION_RULE, HEALED_BY_MODEL],
  [
    ThreadFailureClass.REFUSAL,
    {
      healable: false,
      ownerOnly: true,
      retryable: true,
      remedies: [ThreadFailureRemedy.CHANGE_TOPIC],
    },
  ],
  [ThreadFailureClass.CONTEXT_OVERFLOW, HEALED_BY_MODEL],
  [ThreadFailureClass.PRICING_UNAVAILABLE, HEALED_BY_MODEL],
  [
    ThreadFailureClass.CAP_TOO_LOW,
    {
      ...HEALED_BY_MODEL,
      remedies: [
        ThreadFailureRemedy.RAISE_SPEND_CAP,
        ThreadFailureRemedy.SHORTER_ARTICLE,
        ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
      ],
    },
  ],
  [
    ThreadFailureClass.CREDIT_EXHAUSTED,
    {
      healable: false,
      ownerOnly: true,
      retryable: false,
      remedies: [ThreadFailureRemedy.ADD_CREDIT],
    },
  ],
  [
    ThreadFailureClass.ENTITLEMENT,
    {
      healable: false,
      ownerOnly: true,
      retryable: true,
      remedies: [ThreadFailureRemedy.USE_RECOMMENDED_TEAM],
    },
  ],
  [
    ThreadFailureClass.RESEARCH_FAILED,
    {
      healable: true,
      ownerOnly: false,
      retryable: true,
      remedies: [ThreadFailureRemedy.TRY_AGAIN, ThreadFailureRemedy.CHANGE_TOPIC],
    },
  ],
  [
    ThreadFailureClass.REVIEW_NOT_PASSED,
    {
      healable: false,
      ownerOnly: false,
      retryable: true,
      remedies: [
        ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
        ThreadFailureRemedy.SHORTER_ARTICLE,
        ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
      ],
    },
  ],
  [
    ThreadFailureClass.EVIDENCE_GAP,
    {
      healable: false,
      ownerOnly: false,
      retryable: true,
      remedies: [
        ThreadFailureRemedy.RESEARCH_MORE,
        ThreadFailureRemedy.NARROW_CLAIMS,
        ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
      ],
    },
  ],
  [ThreadFailureClass.QUEUE_WORKER, PLAIN_RETRY],
  [ThreadFailureClass.CANCELLED, PLAIN_RETRY],
  [
    ThreadFailureClass.UNKNOWN,
    {
      healable: true,
      ownerOnly: false,
      retryable: true,
      remedies: [ThreadFailureRemedy.TRY_AGAIN, ThreadFailureRemedy.USE_RECOMMENDED_TEAM],
    },
  ],
]);

/** Used when a class has no entry: a plain retry is the only advice that is always safe. */
export const DEFAULT_FAILURE_CLASS_INFO: FailureClassInfo = PLAIN_RETRY;
