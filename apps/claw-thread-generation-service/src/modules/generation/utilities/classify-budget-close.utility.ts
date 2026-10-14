import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import {
  NON_RETRYABLE_STEP_CODES,
  PLATFORM_FAILURE_CODE_PREFIXES,
  PLATFORM_FAILURE_STEP_CODES,
} from '../constants/step-recorder.constants';

/** True when the platform, not the owner or the review verdict, caused the failure. */
export function isPlatformFailureCode(code: string | null | undefined): boolean {
  return (
    !!code &&
    !NON_RETRYABLE_STEP_CODES.has(code) &&
    (PLATFORM_FAILURE_STEP_CODES.has(code) ||
      PLATFORM_FAILURE_CODE_PREFIXES.some((prefix) => code.startsWith(prefix)))
  );
}

/**
 * The close status for a job that ended FAILED with no draft: PLATFORM_FAILED refunds the Free
 * allowance, RELEASED keeps it spent (owner or billing refusal, review not passed, unknown code).
 */
export function budgetCloseStatusForFailure(
  code: string | null | undefined,
): GenerationBudgetCloseStatus {
  return isPlatformFailureCode(code)
    ? GenerationBudgetCloseStatus.PLATFORM_FAILED
    : GenerationBudgetCloseStatus.RELEASED;
}
