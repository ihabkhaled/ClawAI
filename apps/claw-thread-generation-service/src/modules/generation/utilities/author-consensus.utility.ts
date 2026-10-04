import type { AuthorConsensusResult, AuthorDraftHash } from '../types/author-consensus.types';

export function resolveAuthorConsensus(drafts: AuthorDraftHash[]): AuthorConsensusResult {
  if (drafts.length < 3 || drafts.length > 5) return { status: 'invalid', reason: 'author-count' };
  const roles = new Set(drafts.map((draft) => draft.role));
  if (roles.size !== drafts.length) return { status: 'invalid', reason: 'duplicate-role' };
  if (drafts.some((draft) => draft.draftHash.trim().length === 0)) {
    return { status: 'invalid', reason: 'missing-hash' };
  }
  const draftHash = drafts[0]?.draftHash;
  if (draftHash === undefined) return { status: 'invalid', reason: 'author-count' };
  return drafts.every((draft) => draft.draftHash === draftHash)
    ? { status: 'consensus', draftHash }
    : { status: 'dissent' };
}
