/**
 * The outcome of the ONE comparative judge call a Compare run makes.
 *
 * `RANKED` is the only state that carries scores. `UNAVAILABLE` means the judge
 * ran (or tried to) and produced nothing usable — the run shows "judge
 * unavailable", never a winner picked by default. `SKIPPED` means the judge was
 * never called, because there was nothing to compare.
 */
export enum CompareJudgeVerdictStatus {
  RANKED = 'ranked',
  UNAVAILABLE = 'unavailable',
  SKIPPED = 'skipped',
}
