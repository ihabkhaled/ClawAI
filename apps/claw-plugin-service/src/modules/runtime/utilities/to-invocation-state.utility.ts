import { InvocationState } from '../../../common/enums/invocation-status.enum';
import { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';

/** The audit status for an answer. CONSENT_REQUIRED is a question and is never audited; it maps to DENIED to stay total. */
export function toInvocationState(outcome: InvokeOutcome): InvocationState {
  switch (outcome) {
    case InvokeOutcome.OK:
      return InvocationState.OK;
    case InvokeOutcome.ERROR:
      return InvocationState.ERROR;
    case InvokeOutcome.TIMEOUT:
      return InvocationState.TIMEOUT;
    case InvokeOutcome.BLOCKED:
      return InvocationState.BLOCKED;
    case InvokeOutcome.RATE_LIMITED:
      return InvocationState.RATE_LIMITED;
    case InvokeOutcome.QUOTA_EXCEEDED:
      return InvocationState.QUOTA_EXCEEDED;
    default:
      return InvocationState.DENIED;
  }
}
