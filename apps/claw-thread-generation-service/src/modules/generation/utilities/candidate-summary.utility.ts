import { CANDIDATE_SUMMARY_LEAD } from '../constants/output-failure.constants';
import type { CandidateOutcome } from '../types/candidate-outcome.types';

/**
 * The cause to report when every candidate of a role failed: the code that repeated most (a
 * repeated code is a cause the retry did not move), the earliest one on a tie. With all codes
 * different that is the first candidate's, the model the owner actually chose, not whichever
 * fallback happened to fail last.
 */
export function pickPrimaryOutcome(outcomes: readonly CandidateOutcome[]): CandidateOutcome | null {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) counts.set(outcome.code, (counts.get(outcome.code) ?? 0) + 1);
  let primary: CandidateOutcome | null = null;
  let best = 0;
  for (const outcome of outcomes) {
    const count = counts.get(outcome.code) ?? 0;
    if (count > best) {
      best = count;
      primary = outcome;
    }
  }
  return primary;
}

function describeOutcome(outcome: CandidateOutcome): string {
  const status = outcome.httpStatus === null ? '' : ` (HTTP ${String(outcome.httpStatus)})`;
  return `${outcome.provider}/${outcome.model}: ${outcome.code}${status}`;
}

/** One line for the owner and the operator: the main cause, then what each candidate did. */
export function formatCandidateSummary(
  outcomes: readonly CandidateOutcome[],
  primary: CandidateOutcome,
): string {
  const repeats = outcomes.filter((outcome) => outcome.code === primary.code).length;
  const lead = `${CANDIDATE_SUMMARY_LEAD} Main cause: ${primary.code} (${String(repeats)} of ${String(outcomes.length)}).`;
  return `${lead} ${outcomes.map(describeOutcome).join('; ')}.`;
}
