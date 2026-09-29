/**
 * Where a branch copy stops relative to its pivot message.
 *
 * INCLUDE (the default) keeps the pivot: "continue from this answer".
 * BEFORE stops just short of it: "ask this differently" — the edited question
 * then goes into the new branch while the original stays exactly as it was.
 */
export enum BranchCut {
  INCLUDE = 'INCLUDE',
  BEFORE = 'BEFORE',
}
