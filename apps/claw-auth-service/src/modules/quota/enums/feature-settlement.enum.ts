/** What happened to a reserved run of a metered feature (F3d, ADR-110). */
export enum FeatureSettlement {
  /** The work was delivered: the run counts. */
  CONSUME = 'CONSUME',
  /** The work failed or was never started: the run is given back. */
  RELEASE = 'RELEASE',
}
