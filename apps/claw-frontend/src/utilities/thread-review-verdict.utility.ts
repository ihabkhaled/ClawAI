import {
  ThreadFailureClass,
  type ThreadGenerationFailure,
  type ThreadReviewVerdict,
} from '@claw/shared-types';

import {
  THREAD_EVIDENCE_FOUND_CODE,
  THREAD_EVIDENCE_REASON_BLOCKED_KEY,
  THREAD_EVIDENCE_STEP_MESSAGES,
  THREAD_REVIEW_VERDICT_CODES,
} from '@/constants/thread-evidence.constants';
import { THREAD_CLASS_REASON_KEYS } from '@/constants/thread-recovery.constants';
import type { ThreadFailureKeys } from '@/types/thread-generation-progress.types';

/** The verdict a review step carries in its excerpt, or null for anything else. */
export function parseThreadReviewVerdict(
  excerpt: string | null,
): Pick<ThreadReviewVerdict, 'score' | 'minScore' | 'blockers'> | null {
  if (excerpt === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(excerpt);
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const score: unknown = Reflect.get(value, 'score');
    const minScore: unknown = Reflect.get(value, 'minScore');
    const blockers: unknown = Reflect.get(value, 'blockers');
    if (
      typeof score !== 'number' ||
      typeof minScore !== 'number' ||
      !Array.isArray(blockers) ||
      !blockers.every((blocker) => typeof blocker === 'string')
    ) {
      return null;
    }
    return { score, minScore, blockers: blockers.map(String) };
  } catch {
    return null;
  }
}

export function isThreadReviewVerdictCode(code: string | null): boolean {
  return code !== null && THREAD_REVIEW_VERDICT_CODES.has(code);
}

/** True for the codes of the extra research pass and of a blocked review. */
export function isThreadEvidenceCode(code: string): boolean {
  return THREAD_EVIDENCE_STEP_MESSAGES[code] !== undefined;
}

/** The keys (and the `{count}` of a finished pass) of an evidence step, or null for another code. */
export function resolveThreadEvidenceKeys(
  code: string,
  excerpt: string | null,
): ThreadFailureKeys | null {
  const known = THREAD_EVIDENCE_STEP_MESSAGES[code];
  if (known === undefined) {
    return null;
  }
  const params: Record<string, string> = { code };
  if (code === THREAD_EVIDENCE_FOUND_CODE) {
    params.count = String(readAddedCount(excerpt));
  }
  return { messageKey: known.messageKey, hintKey: known.hintKey, params };
}

function readAddedCount(excerpt: string | null): number {
  try {
    const value: unknown = JSON.parse(excerpt ?? '');
    const added: unknown =
      typeof value === 'object' && value !== null ? Reflect.get(value, 'added') : undefined;
    return typeof added === 'number' && Number.isFinite(added) ? added : 0;
  } catch {
    return 0;
  }
}

/** The one-sentence reason of a failure; a review blocked by an unmet requirement says so. */
export function threadFailureReasonKey(
  failure: ThreadGenerationFailure,
  failureClass: ThreadFailureClass,
): string {
  const blocked =
    failureClass === ThreadFailureClass.REVIEW_NOT_PASSED && failure.review?.blocked === true;
  return blocked ? THREAD_EVIDENCE_REASON_BLOCKED_KEY : THREAD_CLASS_REASON_KEYS[failureClass];
}
