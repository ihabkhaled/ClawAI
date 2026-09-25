// How one vision-helper attempt ended (ADR-120 batch 5). Recorded per attempt
// in the assistant message's `metadata.helperExecutions` and on the
// `visionHelper` log line — never with the image or the observations.
//
// REFUSED and TIMED_OUT end the candidate walk: a credit refusal is never a
// reason to try the next paid provider (rule 37 item 18), and a timed-out call
// may still finish and settle its own hold. FAILED and REJECTED_IMAGE released
// their hold, so trying the next candidate spends nothing twice.
export enum VisionHelperOutcome {
  SUCCEEDED = 'SUCCEEDED',
  /** The provider refused the image input itself ("model does not support images"). */
  REJECTED_IMAGE = 'REJECTED_IMAGE',
  /** Any other provider failure, or an empty description. */
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  /** 402, a clamped hold, an unreachable meter or an unpriced model. Terminal. */
  REFUSED = 'REFUSED',
}
