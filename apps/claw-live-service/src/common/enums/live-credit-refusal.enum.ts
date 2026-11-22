/** Why a paid block could not be charged. */
export enum LiveCreditRefusal {
  /** The wallet cannot cover the block: grace logic applies. */
  INSUFFICIENT = 'INSUFFICIENT',
  /** The meter was unreachable or unparseable: retry next tick, never charge blind. */
  METER_UNAVAILABLE = 'METER_UNAVAILABLE',
}
