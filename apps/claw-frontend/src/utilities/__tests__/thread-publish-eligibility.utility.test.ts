import { describe, expect, it } from 'vitest';

import type { ThreadGenerationState } from '@/types/thread-publication.types';
import { threadContentDirection } from '@/utilities/thread-content-direction.utility';
import { isThreadPublishable } from '@/utilities/thread-publish-eligibility.utility';
import { threadRoleNumber } from '@/utilities/thread-role-number.utility';

function state(overrides: Partial<ThreadGenerationState>): ThreadGenerationState {
  return {
    publicationId: 'p',
    publicationStatus: 'READY_FOR_REVIEW',
    jobId: 'j',
    status: 'WAITING_FOR_REVIEW',
    stage: 'READY_FOR_REVIEW',
    round: 1,
    safeErrorCode: null,
    draft: null,
    ...overrides,
  };
}

describe('isThreadPublishable', () => {
  it('allows first publish and republish after Unpublish by status', () => {
    expect(isThreadPublishable(state({ publicationStatus: 'READY_FOR_REVIEW' }))).toBe(true);
    expect(isThreadPublishable(state({ publicationStatus: 'UNPUBLISHED' }))).toBe(true);
  });

  it('refuses drafts, published and revoked Threads', () => {
    for (const publicationStatus of ['DRAFT', 'PUBLISHED', 'REVOKED']) {
      expect(isThreadPublishable(state({ publicationStatus }))).toBe(false);
    }
    expect(isThreadPublishable(undefined)).toBe(false);
  });

  it('trusts the service flags when present', () => {
    expect(
      isThreadPublishable(state({ publicationStatus: 'UNPUBLISHED', canPublish: false })),
    ).toBe(false);
    expect(isThreadPublishable(state({ publicationStatus: 'DRAFT', canRepublish: true }))).toBe(
      true,
    );
  });
});

describe('threadContentDirection', () => {
  it('is rtl for Arabic and Persian and ltr otherwise', () => {
    expect(threadContentDirection('ar')).toBe('rtl');
    expect(threadContentDirection('fa')).toBe('rtl');
    expect(threadContentDirection('en')).toBe('ltr');
  });
});

describe('threadRoleNumber', () => {
  it('numbers author ids only', () => {
    expect(threadRoleNumber('author-2')).toBe(' 2');
    expect(threadRoleNumber('judge')).toBe('');
  });
});
