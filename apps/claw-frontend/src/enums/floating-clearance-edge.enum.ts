/**
 * Which edge a clearance is measured from.
 *
 * The same measurement serves both: "how far up from the bottom must this
 * column start" and "how far down from the top". Splitting it into two hooks
 * would duplicate the observer lifecycle — the part that has been wrong twice —
 * so the edge is a parameter instead.
 */
export enum FloatingClearanceEdge {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}
