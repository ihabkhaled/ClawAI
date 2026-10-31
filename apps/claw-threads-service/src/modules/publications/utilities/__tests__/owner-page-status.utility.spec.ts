import { PublicationGenerationState, PublicationStatus } from '../../../../generated/prisma';
import type { OwnerPageStateRow } from '../../types/owner-publication-page.types';
import {
  canOwnerDelete,
  canOwnerPublish,
  deriveOwnerPageFailure,
  deriveOwnerPageStatus,
  safeFailureCode,
} from '../owner-page-status.utility';

function row(
  status: PublicationStatus,
  generationState: PublicationGenerationState | null = null,
  extra: Partial<OwnerPageStateRow> = {},
): OwnerPageStateRow {
  return {
    status,
    generationState,
    generationFailureCode: null,
    generationFailureStep: null,
    generationFailureRetryable: null,
    ...extra,
  };
}

describe('deriveOwnerPageStatus', () => {
  it.each([
    [PublicationStatus.PUBLISHED, null, 'PUBLISHED'],
    [PublicationStatus.PUBLISHED, PublicationGenerationState.FAILED, 'PUBLISHED'],
    [PublicationStatus.READY_FOR_REVIEW, null, 'READY'],
    [PublicationStatus.UNPUBLISHED, null, 'READY'],
    [PublicationStatus.REVOKED, null, 'FAILED'],
    [PublicationStatus.DRAFT, null, 'GENERATING'],
    [PublicationStatus.DRAFT, PublicationGenerationState.GENERATING, 'GENERATING'],
    [PublicationStatus.DRAFT, PublicationGenerationState.DONE, 'READY'],
    [PublicationStatus.DRAFT, PublicationGenerationState.FAILED, 'FAILED'],
    [PublicationStatus.DRAFT, PublicationGenerationState.CANCELLED, 'FAILED'],
  ] as const)('%s with job %s is %s', (status, state, expected) => {
    expect(deriveOwnerPageStatus(row(status, state))).toBe(expected);
  });

  it('reports one of exactly four statuses for every combination', () => {
    const seen = new Set<string>();
    for (const status of Object.values(PublicationStatus)) {
      for (const state of [null, ...Object.values(PublicationGenerationState)]) {
        seen.add(deriveOwnerPageStatus(row(status, state)));
      }
    }
    expect([...seen].sort()).toEqual(['FAILED', 'GENERATING', 'PUBLISHED', 'READY']);
  });
});

describe('deriveOwnerPageFailure', () => {
  it('is null unless the row is FAILED', () => {
    expect(deriveOwnerPageFailure(row(PublicationStatus.DRAFT, null))).toBeNull();
    expect(deriveOwnerPageFailure(row(PublicationStatus.PUBLISHED))).toBeNull();
    expect(
      deriveOwnerPageFailure(row(PublicationStatus.DRAFT, PublicationGenerationState.DONE)),
    ).toBeNull();
  });

  it('returns the stored machine code, step and retryable flag of a failed job', () => {
    expect(
      deriveOwnerPageFailure(
        row(PublicationStatus.DRAFT, PublicationGenerationState.FAILED, {
          generationFailureCode: 'JUDGE_SCORE_LOW',
          generationFailureStep: 'REVIEW',
          generationFailureRetryable: false,
        }),
      ),
    ).toEqual({ code: 'JUDGE_SCORE_LOW', retryable: false, step: 'REVIEW' });
  });

  it('reports a cancelled job as FAILED with code JOB_CANCELLED, retryable', () => {
    expect(
      deriveOwnerPageFailure(row(PublicationStatus.DRAFT, PublicationGenerationState.CANCELLED)),
    ).toEqual({ code: 'JOB_CANCELLED', retryable: true, step: null });
  });

  it('reports a revoked publication as PUBLICATION_REVOKED, never retryable', () => {
    expect(deriveOwnerPageFailure(row(PublicationStatus.REVOKED))).toEqual({
      code: 'PUBLICATION_REVOKED',
      retryable: false,
      step: null,
    });
  });

  it('never passes raw text through: a stored value that is not a machine code becomes the generic code', () => {
    const failure = deriveOwnerPageFailure(
      row(PublicationStatus.DRAFT, PublicationGenerationState.FAILED, {
        generationFailureCode: 'Bearer sk-live-abc: provider said no',
      }),
    );
    expect(failure?.code).toBe('GENERATION_FAILED');
    expect(safeFailureCode('lower_case', 'X_FALLBACK')).toBe('X_FALLBACK');
    expect(safeFailureCode(null, 'X_FALLBACK')).toBe('X_FALLBACK');
    expect(safeFailureCode('PROVIDER_ERROR', 'X_FALLBACK')).toBe('PROVIDER_ERROR');
  });
});

describe('canOwnerPublish / canOwnerDelete', () => {
  it('publish needs READY_FOR_REVIEW or UNPUBLISHED and a publishable revision', () => {
    for (const status of Object.values(PublicationStatus)) {
      const eligible = status === 'READY_FOR_REVIEW' || status === 'UNPUBLISHED';
      expect(canOwnerPublish(status, true)).toBe(eligible);
      expect(canOwnerPublish(status, false)).toBe(false);
    }
  });

  it('delete is refused for PUBLISHED and REVOKED, and for a DRAFT whose job runs or is unread', () => {
    expect(canOwnerDelete(row(PublicationStatus.PUBLISHED))).toBe(false);
    expect(canOwnerDelete(row(PublicationStatus.REVOKED))).toBe(false);
    expect(canOwnerDelete(row(PublicationStatus.DRAFT, null))).toBe(false);
    expect(
      canOwnerDelete(row(PublicationStatus.DRAFT, PublicationGenerationState.GENERATING)),
    ).toBe(false);
  });

  it('delete is offered for a failed, cancelled or finished draft, a reviewed one and an unpublished one', () => {
    for (const state of [
      PublicationGenerationState.FAILED,
      PublicationGenerationState.CANCELLED,
      PublicationGenerationState.DONE,
    ]) {
      expect(canOwnerDelete(row(PublicationStatus.DRAFT, state))).toBe(true);
    }
    expect(canOwnerDelete(row(PublicationStatus.READY_FOR_REVIEW))).toBe(true);
    expect(canOwnerDelete(row(PublicationStatus.UNPUBLISHED))).toBe(true);
  });
});
