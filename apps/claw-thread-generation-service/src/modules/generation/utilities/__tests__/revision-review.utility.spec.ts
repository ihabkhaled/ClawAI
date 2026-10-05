import { evaluateRevisionReview, revisionDraftHash } from '../revision-review.utility';

describe('evaluateRevisionReview', () => {
  const draft = {
    markdown: '# Edited article\n\nVerified statement [1].',
    citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
  };
  const evidence = new Map([['evidence-1', 'https://example.test/source']]);
  const draftHash = revisionDraftHash(draft);
  const votes = [
    { roleId: 'author-1', agrees: true, draftHash },
    { roleId: 'author-2', agrees: true, draftHash },
    { roleId: 'author-3', agrees: true, draftHash },
  ];
  const judge = { score: 85, blockers: [], findings: [], revisionBrief: '' };
  const critic = { score: 78, blockers: [], findings: [], revisionBrief: '' };

  it('accepts only unanimous author review of the exact edited text and passing reviews', () => {
    expect(
      evaluateRevisionReview({
        draft,
        expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
        votes,
        judge,
        critic,
        evidence,
      }),
    ).toMatchObject({ ready: true, reasons: [] });
  });

  it('rejects citations that do not exactly match the saved evidence bundle', () => {
    expect(
      evaluateRevisionReview({
        draft: {
          ...draft,
          citations: [{ evidenceId: 'evidence-1', url: 'https://attacker.test/fake' }],
        },
        expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
        votes,
        judge,
        critic,
        evidence,
      }).reasons,
    ).toContain('CITATION_NOT_IN_SAVED_EVIDENCE');
  });

  it('rejects a reviewer vote for a different content hash', () => {
    expect(
      evaluateRevisionReview({
        draft,
        expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
        votes: votes.map((vote, index) =>
          index === 1 ? { ...vote, draftHash: 'different-hash' } : vote,
        ),
        judge,
        critic,
        evidence,
      }).reasons,
    ).toContain('AUTHOR_CONSENSUS_FAILED');
  });

  it('rejects duplicate author votes even when their count matches the configured authors', () => {
    expect(
      evaluateRevisionReview({
        draft,
        expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
        votes: votes.map((vote, index) => (index === 1 ? { ...vote, roleId: 'author-1' } : vote)),
        judge,
        critic,
        evidence,
      }).reasons,
    ).toContain('AUTHOR_CONSENSUS_FAILED');
  });

  it('rejects disagreement, missing reviewers, and review scores below thresholds', () => {
    const result = evaluateRevisionReview({
      draft,
      expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
      votes: votes.slice(0, 2).map((vote) => ({ ...vote, agrees: false })),
      judge: { ...judge, score: 79 },
      critic: { ...critic, score: 74, blockers: ['unsupported claim'] },
      evidence,
    });

    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'AUTHOR_CONSENSUS_FAILED',
        'JUDGE_THRESHOLD_FAILED',
        'CRITIC_THRESHOLD_FAILED',
      ]),
    );
  });
});
