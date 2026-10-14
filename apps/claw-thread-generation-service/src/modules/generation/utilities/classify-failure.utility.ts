import { ThreadFailureClass, ThreadFailurePhase } from '@claw/shared-types';

import { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';
import {
  DEFAULT_FAILURE_CLASS_INFO,
  ENTITLEMENT_CODE_PATTERN,
  FAILURE_CLASS_BY_CODE,
  FAILURE_CLASS_INFO,
  GENERIC_PROVIDER_ERROR_CODE,
  HTTP_STATUS_CLIENT_ERROR_MIN,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_PAYLOAD_TOO_LARGE,
  HTTP_STATUS_PAYMENT_REQUIRED,
  HTTP_STATUS_RATE_LIMITED,
  HTTP_STATUS_SERVER_ERROR_MIN,
  HTTP_STATUS_TIMEOUTS,
  HTTP_STATUS_UNAUTHORIZED,
  REFUSAL_CODE_PATTERN,
} from '../constants/failure-class.constants';
import { PHASE_BY_STAGE } from '../constants/failure-phase.constants';
import type { FailureClassification, FailureInput } from '../types/failure-classification.types';

function classOfOutput(input: FailureInput): ThreadFailureClass {
  switch (input.outputKind) {
    case ModelOutputFailureKind.EMPTY:
      return ThreadFailureClass.EMPTY_OUTPUT;
    case ModelOutputFailureKind.TRUNCATED:
      return ThreadFailureClass.TRUNCATED_OUTPUT;
    case ModelOutputFailureKind.PROSE:
    case ModelOutputFailureKind.INVALID_JSON:
      return ThreadFailureClass.INVALID_JSON;
    case ModelOutputFailureKind.WRONG_SHAPE:
      return input.citationRule === true
        ? ThreadFailureClass.CITATION_RULE
        : ThreadFailureClass.WRONG_SHAPE;
    case undefined:
      return input.citationRule === true
        ? ThreadFailureClass.CITATION_RULE
        : ThreadFailureClass.WRONG_SHAPE;
  }
}

function classOfStatus(status: number | null): ThreadFailureClass {
  if (status === null) return ThreadFailureClass.NETWORK;
  if (status === HTTP_STATUS_RATE_LIMITED) return ThreadFailureClass.PROVIDER_RATE_LIMITED;
  if (status === HTTP_STATUS_PAYLOAD_TOO_LARGE) return ThreadFailureClass.CONTEXT_OVERFLOW;
  // A bare 402 with no PAYG code is the provider's own billing, not the owner's wallet.
  if (status === HTTP_STATUS_PAYMENT_REQUIRED) return ThreadFailureClass.PROVIDER_CREDIT;
  if (status === HTTP_STATUS_UNAUTHORIZED || status === HTTP_STATUS_FORBIDDEN) {
    return ThreadFailureClass.ENTITLEMENT;
  }
  if (HTTP_STATUS_TIMEOUTS.has(status)) return ThreadFailureClass.PROVIDER_TIMEOUT;
  if (status >= HTTP_STATUS_SERVER_ERROR_MIN) return ThreadFailureClass.PROVIDER_UNAVAILABLE;
  return status >= HTTP_STATUS_CLIENT_ERROR_MIN
    ? ThreadFailureClass.PROVIDER_REJECTED
    : ThreadFailureClass.UNKNOWN;
}

/** The failure class of one step failure: the code first, then the output kind, then the status. */
export function classOfFailure(input: FailureInput): ThreadFailureClass {
  if (REFUSAL_CODE_PATTERN.test(input.code)) return ThreadFailureClass.REFUSAL;
  if (ENTITLEMENT_CODE_PATTERN.test(input.code)) return ThreadFailureClass.ENTITLEMENT;
  if (input.code === 'OUTPUT_INVALID') return classOfOutput(input);
  const known = FAILURE_CLASS_BY_CODE.get(input.code);
  if (known !== undefined) return known;
  return input.code === GENERIC_PROVIDER_ERROR_CODE || input.httpStatus !== null
    ? classOfStatus(input.httpStatus)
    : ThreadFailureClass.UNKNOWN;
}

/** Which part of a generation a step stage belongs to; an unknown stage is FINALIZE. */
export function phaseOfStage(stage: string | undefined, citationRule = false): ThreadFailurePhase {
  if (citationRule) return ThreadFailurePhase.CITATIONS;
  return (
    (stage === undefined ? undefined : PHASE_BY_STAGE.get(stage)) ?? ThreadFailurePhase.FINALIZE
  );
}

/**
 * Maps one step failure to {phase, class, retryable, remedies} (ADR-181). Pure: the same input
 * always gives the same answer, so the ladder, the progress view and the specs agree.
 */
export function classifyFailure(input: FailureInput): FailureClassification {
  const failureClass = classOfFailure(input);
  const info = FAILURE_CLASS_INFO.get(failureClass) ?? DEFAULT_FAILURE_CLASS_INFO;
  return {
    ...info,
    failureClass,
    phase: phaseOfStage(input.stage, failureClass === ThreadFailureClass.CITATION_RULE),
  };
}
