export interface AuthorDraftHash {
  role: string;
  draftHash: string;
}

export type AuthorConsensusResult =
  | { status: 'consensus'; draftHash: string }
  | { status: 'dissent' }
  | { status: 'invalid'; reason: 'author-count' | 'duplicate-role' | 'missing-hash' };
