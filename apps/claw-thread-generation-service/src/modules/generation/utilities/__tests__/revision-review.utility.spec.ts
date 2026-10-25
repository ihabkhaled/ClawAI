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

  it('reports unanimous agreement while passing Judge and Critic approval', () => {
    expect(
      evaluateRevisionReview({
        draft,
        expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
        votes,
        judge,
        critic,
        evidence,
      }),
    ).toMatchObject({ ready: true, authorAgreementPercent: 100, reasons: [] });
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

  it('reports only votes that reviewed the exact edited content', () => {
    const result = evaluateRevisionReview({
      draft,
      expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
      votes: votes.map((vote, index) =>
        index === 1 ? { ...vote, draftHash: 'different-hash' } : vote,
      ),
      judge,
      critic,
      evidence,
    });

    expect(result.authorAgreementPercent).toBe(67);
    expect(result.ready).toBe(true);
  });

  it('does not count duplicate votes from one author twice', () => {
    const result = evaluateRevisionReview({
      draft,
      expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
      votes: votes.map((vote, index) => (index === 1 ? { ...vote, roleId: 'author-1' } : vote)),
      judge,
      critic,
      evidence,
    });

    expect(result.authorAgreementPercent).toBe(67);
    expect(result.ready).toBe(true);
  });

  it('lets Judge and Critic decide when authors disagree, and reports their percentage', () => {
    const result = evaluateRevisionReview({
      draft,
      expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
      votes: votes.map((vote, index) => ({ ...vote, agrees: index === 0 })),
      judge,
      critic,
      evidence,
    });

    expect(result.ready).toBe(true);
    expect(result.authorAgreementPercent).toBe(33);
    expect(result.reasons).toEqual([]);
  });

  it('still blocks publication when Judge or Critic review fails', () => {
    const result = evaluateRevisionReview({
      draft,
      expectedAuthorIds: ['author-1', 'author-2', 'author-3'],
      votes,
      judge: { ...judge, score: 79 },
      critic: { ...critic, score: 74, blockers: ['unsupported claim'] },
      evidence,
    });

    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['JUDGE_THRESHOLD_FAILED', 'CRITIC_THRESHOLD_FAILED']),
    );
  });
});
