import { PublicationGenerationState, PublicationStatus } from '../../../generated/prisma';
import {
  OWNER_PAGE_CODE_FAILED,
  OWNER_PAGE_CODE_JOB_CANCELLED,
  OWNER_PAGE_CODE_REVOKED,
  OWNER_PAGE_SAFE_CODE_PATTERN,
  type OwnerPageStatus,
} from '../constants/publication-owner-page.constants';
import {
  OWNER_DELETABLE_PUBLICATION_STATUSES,
  PUBLISHABLE_PUBLICATION_STATUSES,
} from '../constants/publication-generation-owner.constants';
import type {
  GenerationStateUpdate,
  OwnerPageFailure,
  OwnerPageStateRow,
} from '../types/owner-publication-page.types';

/**
 * The status the owner list reports (ADR-205), from the stored publication status and the last
 * known job state. The SQL filter in `owner-page-sql.utility.ts` mirrors this exactly.
 *  - PUBLISHED: live.
 *  - READY: reviewed and waiting (READY_FOR_REVIEW), unpublished, or a DRAFT whose job finished.
 *  - FAILED: the job FAILED or was CANCELLED (cancelled counts as failed, code JOB_CANCELLED, and
 *    can be retried), or the publication was REVOKED by moderation (code PUBLICATION_REVOKED).
 *  - GENERATING: a DRAFT whose job is queued, running, or not read yet.
 */
export function deriveOwnerPageStatus(row: OwnerPageStateRow): OwnerPageStatus {
  switch (row.status) {
    case PublicationStatus.PUBLISHED:
      return 'PUBLISHED';
    case PublicationStatus.REVOKED:
      return 'FAILED';
    case PublicationStatus.READY_FOR_REVIEW:
    case PublicationStatus.UNPUBLISHED:
      return 'READY';
    case PublicationStatus.DRAFT:
      break;
  }
  switch (row.generationState) {
    case PublicationGenerationState.FAILED:
    case PublicationGenerationState.CANCELLED:
      return 'FAILED';
    case PublicationGenerationState.DONE:
      return 'READY';
    default:
      return 'GENERATING';
  }
}

/** A code the frontend can translate: the stable machine form only, else the generic one. */
export function safeFailureCode(code: string | null | undefined, fallback: string): string {
  return code && OWNER_PAGE_SAFE_CODE_PATTERN.test(code) ? code : fallback;
}

/** `null` unless the row reports FAILED. Never raw provider text: only the stored machine code. */
export function deriveOwnerPageFailure(row: OwnerPageStateRow): OwnerPageFailure | null {
  if (deriveOwnerPageStatus(row) !== 'FAILED') return null;
  if (row.status === PublicationStatus.REVOKED) {
    return { code: OWNER_PAGE_CODE_REVOKED, retryable: false, step: null };
  }
  const cancelled = row.generationState === PublicationGenerationState.CANCELLED;
  return {
    code: safeFailureCode(
      row.generationFailureCode,
      cancelled ? OWNER_PAGE_CODE_JOB_CANCELLED : OWNER_PAGE_CODE_FAILED,
    ),
    retryable: row.generationFailureRetryable ?? true,
    step: row.generationFailureStep,
  };
}

/**
 * Publish accepts a publication in READY_FOR_REVIEW or UNPUBLISHED (not DRAFT, PUBLISHED or
 * REVOKED) that has a publishable revision; PUBLISHED is already live, so it is not offered again.
 */
export function canOwnerPublish(
  status: PublicationStatus,
  hasPublishableRevision: boolean,
): boolean {
  return PUBLISHABLE_PUBLICATION_STATUSES.includes(status) && hasPublishableRevision;
}

/**
 * Delete accepts DRAFT, READY_FOR_REVIEW and UNPUBLISHED and refuses while the job is queued or
 * running (cancel first). A job not read yet counts as running, so the list never offers a delete
 * the service would answer with 409.
 */
export function canOwnerDelete(row: OwnerPageStateRow, hasJob = true): boolean {
  if (!OWNER_DELETABLE_PUBLICATION_STATUSES.includes(row.status)) return false;
  // No job means nothing can be running.
  return hasJob
    ? !(row.status === PublicationStatus.DRAFT && deriveOwnerPageStatus(row) === 'GENERATING')
    : true;
}

/** The state to store for a failed or cancelled job: a machine code only, a step of at most 64 chars. */
export function failureUpdate(
  state: PublicationGenerationState,
  code: string | null,
  step: string | null,
  retryable: boolean,
): GenerationStateUpdate {
  return {
    state,
    failureCode: safeFailureCode(code, OWNER_PAGE_CODE_FAILED),
    failureStep: step ? step.slice(0, 64) : null,
    failureRetryable: retryable,
  };
}
