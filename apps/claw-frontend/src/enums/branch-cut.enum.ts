/**
 * Where a branch copy stops relative to its pivot message. Mirrors
 * chat-service's `BranchCut`: INCLUDE keeps the pivot ("continue from this
 * answer"); BEFORE stops short of it ("ask this differently").
 */
export enum BranchCut {
  INCLUDE = 'INCLUDE',
  BEFORE = 'BEFORE',
}
