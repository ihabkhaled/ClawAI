export type DeletionScope = {
  userId: string;
  /** Delete just this session; absent means every session of the user. */
  sessionId?: string;
  /** False leaves sessions that are not DETACHED alone (a viewer is still attached). */
  includeActive: boolean;
  /** Account deletion also drops the per-user grace state. Usage months and charges are financial and stay. */
  purgeBillingState: boolean;
};

export type DeletionResult = {
  sessionsDeleted: number;
  /** Sessions skipped because they are still attached. */
  skippedActive: number;
  /** Runs whose content was removed and replaced by a tombstone. */
  tombstonedRunIds: string[];
};

export type DeletionSummary = {
  sessionsDeleted: number;
  skippedActive: number;
  runsDeleted: number;
};
