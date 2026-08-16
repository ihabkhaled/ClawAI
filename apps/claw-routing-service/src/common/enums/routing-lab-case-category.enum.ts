/**
 * Why a routing lab corpus case exists, kept distinct from its content.
 *
 * The manifest breaks pass/decline and error-taxonomy numbers down by this
 * axis so a reader can tell "this decline came from realistic traffic" apart
 * from "this decline is a fault we asked for on purpose".
 */
export enum RoutingLabCaseCategory {
  /** Combinatorial privacy-class x domain x length traffic, no injected fault. */
  BASELINE = 'BASELINE',
  /** Exactly one of the 15 RouterErrorCode values injected once. */
  FAULT_SINGLE = 'FAULT_SINGLE',
  /** A multi-attempt behaviour (retry, repair, provider-wide skip, exhaustion...). */
  FAULT_COMPOUND = 'FAULT_COMPOUND',
  /** Structural or configuration edge cases (empty eligible set, disabled config...). */
  EDGE_CASE = 'EDGE_CASE',
}
