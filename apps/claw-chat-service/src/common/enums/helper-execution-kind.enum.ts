// Which helper model ran beside the conversational model for a turn. The
// conversational model's provider/model on the message are never overwritten;
// helper work is recorded separately in `metadata.helperExecutions`.
export enum HelperExecutionKind {
  VISION = 'VISION',
  // One sampled video frame described for a lane that cannot see (batch 8).
  VIDEO_FRAME = 'VIDEO_FRAME',
}
