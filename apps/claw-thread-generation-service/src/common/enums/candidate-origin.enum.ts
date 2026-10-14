/** Where a candidate model came from; decides which strategy a swap to it is recorded as. */
export enum CandidateOrigin {
  PRIMARY = 'PRIMARY',
  TEAM = 'TEAM',
  POOL = 'POOL',
  SAFE_DEFAULT = 'SAFE_DEFAULT',
}
