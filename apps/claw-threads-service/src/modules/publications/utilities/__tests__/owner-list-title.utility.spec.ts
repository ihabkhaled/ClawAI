import { PublicationSafetyStatus, RevisionReviewStatus } from '../../../../generated/prisma';
import type { OwnerListRevision } from '../../types/owner-publication.types';
import { pickOwnerListTitle } from '../owner-list-title.utility';

const revision = (
  title: string,
  reviewStatus: RevisionReviewStatus,
  extra: Partial<OwnerListRevision> = {},
): OwnerListRevision => ({
  title,
  reviewStatus,
  safetyStatus: PublicationSafetyStatus.APPROVED,
  indexEligible: true,
  ...extra,
});

describe('pickOwnerListTitle', () => {
  it('shows the approved title when the newest revision is STALE and reports the state', () => {
    expect(
      pickOwnerListTitle([
        revision('Perfect Pancakes', RevisionReviewStatus.STALE),
        revision('Heat Pumps', RevisionReviewStatus.OWNER_APPROVED),
        revision('Draft', RevisionReviewStatus.READY_FOR_REVIEW),
      ]),
    ).toEqual({ title: 'Heat Pumps', pendingRevisionStatus: RevisionReviewStatus.STALE });
  });

  it('keeps a revision still under review from replacing the approved title', () => {
    expect(
      pickOwnerListTitle([
        revision('New', RevisionReviewStatus.PENDING),
        revision('Live', RevisionReviewStatus.OWNER_APPROVED),
      ]),
    ).toEqual({ title: 'Live', pendingRevisionStatus: RevisionReviewStatus.PENDING });
  });

  it('shows a passing edit, which is what the owner publishes next', () => {
    expect(
      pickOwnerListTitle([
        revision('Edit', RevisionReviewStatus.READY_FOR_REVIEW),
        revision('Live', RevisionReviewStatus.OWNER_APPROVED),
      ]),
    ).toEqual({ title: 'Edit', pendingRevisionStatus: null });
  });

  it('shows the newest title when nothing was ever approved', () => {
    expect(pickOwnerListTitle([revision('Only', RevisionReviewStatus.STALE)])).toEqual({
      title: 'Only',
      pendingRevisionStatus: null,
    });
  });

  it('ignores an approved revision the public page would not show', () => {
    expect(
      pickOwnerListTitle([
        revision('Bad', RevisionReviewStatus.STALE),
        revision('Unsafe', RevisionReviewStatus.OWNER_APPROVED, { indexEligible: false }),
      ]),
    ).toEqual({ title: 'Bad', pendingRevisionStatus: null });
  });

  it('has no title without revisions', () => {
    expect(pickOwnerListTitle([])).toEqual({ title: null, pendingRevisionStatus: null });
  });
});
