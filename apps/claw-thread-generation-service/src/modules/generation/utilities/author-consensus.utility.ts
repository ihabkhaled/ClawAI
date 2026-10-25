import type { AuthorCandidateVote, AuthorConsensusResult } from '../types/author-consensus.types';

export function resolveAuthorConsensus(
  votes: AuthorCandidateVote[],
  candidateCount: number,
): AuthorConsensusResult {
  if (votes.length < 3 || votes.length > 5 || candidateCount !== votes.length) {
    return { status: 'invalid', reason: 'author-count' };
  }
  const roles = new Set(votes.map((vote) => vote.role));
  if (roles.size !== votes.length) return { status: 'invalid', reason: 'duplicate-role' };
  if (
    votes.some(
      (vote) =>
        !Number.isInteger(vote.preferredCandidateIndex) ||
        vote.preferredCandidateIndex < 0 ||
        vote.preferredCandidateIndex >= candidateCount,
    )
  ) {
    return { status: 'invalid', reason: 'candidate-index' };
  }

  const counts = new Map<number, number>();
  for (const vote of votes) {
    const index = vote.preferredCandidateIndex;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  let preferredCandidateIndex = 0;
  let mostVotes = 0;
  for (let index = 0; index < candidateCount; index += 1) {
    const candidateVotes = counts.get(index) ?? 0;
    if (candidateVotes > mostVotes) {
      preferredCandidateIndex = index;
      mostVotes = candidateVotes;
    }
  }
  const agreementPercent = Math.round((mostVotes / votes.length) * 100);
  return {
    status: mostVotes > votes.length / 2 ? 'consensus' : 'dissent',
    preferredCandidateIndex,
    agreementPercent,
  };
}
