/** The stage the generation worker reports for a running Thread. Mirrors the service's enum. */
export enum ThreadGenerationStage {
  Snapshot = 'SNAPSHOT',
  Research = 'RESEARCH',
  AuthorDrafts = 'AUTHOR_DRAFTS',
  Consensus = 'CONSENSUS',
  Judge = 'JUDGE',
  Critic = 'CRITIC',
  Revision = 'REVISION',
  ReadyForReview = 'READY_FOR_REVIEW',
}
