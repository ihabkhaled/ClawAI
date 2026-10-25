import { resolveAuthorConsensus } from '../author-consensus.utility';

const sameDraft = [
  { role: 'author-1', preferredCandidateIndex: 0 },
  { role: 'author-2', preferredCandidateIndex: 0 },
  { role: 'author-3', preferredCandidateIndex: 0 },
];

describe('resolveAuthorConsensus', () => {
  it('reports the majority choice as a percentage instead of requiring identical drafts', () => {
    expect(resolveAuthorConsensus(sameDraft, 3)).toEqual({
      status: 'consensus',
      preferredCandidateIndex: 0,
      agreementPercent: 100,
    });
  });

  it('keeps a two-of-three majority and reports its percentage', () => {
    expect(
      resolveAuthorConsensus(
        [
          { role: 'author-1', preferredCandidateIndex: 0 },
          { role: 'author-2', preferredCandidateIndex: 1 },
          { role: 'author-3', preferredCandidateIndex: 0 },
        ],
        3,
      ),
    ).toEqual({
      status: 'consensus',
      preferredCandidateIndex: 0,
      agreementPercent: 67,
    });
  });

  it('reports a split vote without blocking the Judge from deciding', () => {
    expect(
      resolveAuthorConsensus(
        [
          { role: 'author-1', preferredCandidateIndex: 0 },
          { role: 'author-2', preferredCandidateIndex: 1 },
          { role: 'author-3', preferredCandidateIndex: 2 },
        ],
        3,
      ),
    ).toEqual({
      status: 'dissent',
      preferredCandidateIndex: 0,
      agreementPercent: 33,
    });
  });

  it('rejects author counts outside three to five', () => {
    expect(resolveAuthorConsensus(sameDraft.slice(0, 2), 3)).toEqual({
      status: 'invalid',
      reason: 'author-count',
    });
  });

  it('rejects duplicate roles and empty hashes', () => {
    expect(
      resolveAuthorConsensus(
        [
          { role: 'author-1', preferredCandidateIndex: 0 },
          { role: 'author-1', preferredCandidateIndex: 0 },
          { role: 'author-3', preferredCandidateIndex: 0 },
        ],
        3,
      ),
    ).toEqual({
      status: 'invalid',
      reason: 'duplicate-role',
    });
    expect(
      resolveAuthorConsensus(
        [...sameDraft.slice(0, 2), { role: 'author-3', preferredCandidateIndex: 3 }],
        3,
      ),
    ).toEqual({ status: 'invalid', reason: 'candidate-index' });
  });
});
