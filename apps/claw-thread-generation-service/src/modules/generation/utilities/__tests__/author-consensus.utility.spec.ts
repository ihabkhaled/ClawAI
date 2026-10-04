import { resolveAuthorConsensus } from '../author-consensus.utility';

const sameDraft = [
  { role: 'author-1', draftHash: 'abc' },
  { role: 'author-2', draftHash: 'abc' },
  { role: 'author-3', draftHash: 'abc' },
];

describe('resolveAuthorConsensus', () => {
  it('requires unanimous exact-hash agreement from three authors', () => {
    expect(resolveAuthorConsensus(sameDraft)).toEqual({ status: 'consensus', draftHash: 'abc' });
  });

  it('rejects consensus when any author has a different hash', () => {
    expect(
      resolveAuthorConsensus([...sameDraft.slice(0, 2), { role: 'author-3', draftHash: 'xyz' }]),
    ).toEqual({ status: 'dissent' });
  });

  it('rejects author counts outside three to five', () => {
    expect(resolveAuthorConsensus(sameDraft.slice(0, 2))).toEqual({
      status: 'invalid',
      reason: 'author-count',
    });
  });

  it('rejects duplicate roles and empty hashes', () => {
    expect(
      resolveAuthorConsensus([
        { role: 'author-1', draftHash: 'abc' },
        { role: 'author-1', draftHash: 'abc' },
        { role: 'author-3', draftHash: 'abc' },
      ]),
    ).toEqual({
      status: 'invalid',
      reason: 'duplicate-role',
    });
    expect(
      resolveAuthorConsensus([...sameDraft.slice(0, 2), { role: 'author-3', draftHash: ' ' }]),
    ).toEqual({ status: 'invalid', reason: 'missing-hash' });
  });
});
