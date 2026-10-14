import { GenerationBudgetCloseStatus } from '../../../../common/enums/generation-budget-close-status.enum';
import { NON_RETRYABLE_STEP_CODES } from '../../constants/step-recorder.constants';
import {
  budgetCloseStatusForFailure,
  isPlatformFailureCode,
} from '../classify-budget-close.utility';

const PLATFORM_CODES = [
  'OUTPUT_INVALID',
  'PROVIDER_ERROR',
  'PROVIDER_UNAVAILABLE',
  'CLOUD_PROVIDER_UNAVAILABLE',
  'CLOUD_PROVIDER_TIMEOUT',
  'MODEL_IDLE_TIMEOUT',
  'MODEL_HARD_CEILING',
  'MODEL_REASONED_NO_ANSWER',
  'MODEL_CATALOG_UNREACHABLE',
  'MODEL_CATALOG_REJECTED',
  'GENERATION_FAILED',
  'CANDIDATES_EXHAUSTED',
  'RESEARCH_FAILED',
  'RESEARCH_EMPTY',
  'RESEARCH_UNAVAILABLE',
  'GENERATION_ATTEMPT_TIMEOUT',
  'GENERATION_WORKER_LOST',
  'QUEUE_EXPIRED',
  'LEASE_EXPIRED',
];

const KEPT_CODES = [
  'REVIEW_NOT_PASSED',
  'PAYG_CAP_TOO_LOW',
  'PAYG_CREDIT_EXHAUSTED',
  'PAYG_PRICE_UNAVAILABLE',
  'PAYG_FREE_ALLOWANCE_EXHAUSTED',
  'PAYG_MODEL_UNPRICED',
  'CANCELLED',
  'CONTEXT_WINDOW_EXCEEDED',
  'SOMETHING_NEW',
  '',
];

describe('budgetCloseStatusForFailure', () => {
  it.each(PLATFORM_CODES)('%s is platform-caused and refunds the allowance', (code) => {
    expect(isPlatformFailureCode(code)).toBe(true);
    expect(budgetCloseStatusForFailure(code)).toBe(GenerationBudgetCloseStatus.PLATFORM_FAILED);
  });

  it.each(KEPT_CODES)('%s keeps the allowance spent', (code) => {
    expect(isPlatformFailureCode(code)).toBe(false);
    expect(budgetCloseStatusForFailure(code)).toBe(GenerationBudgetCloseStatus.RELEASED);
  });

  it('keeps the allowance when there is no code', () => {
    expect(budgetCloseStatusForFailure(null)).toBe(GenerationBudgetCloseStatus.RELEASED);
    expect(budgetCloseStatusForFailure(undefined)).toBe(GenerationBudgetCloseStatus.RELEASED);
  });

  it('never refunds a code only the owner can fix', () => {
    for (const code of NON_RETRYABLE_STEP_CODES) expect(isPlatformFailureCode(code)).toBe(false);
  });
});
