/** Whether a generation a media tool started is finished when the answer is stored. */
export enum MediaGenerationState {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  /** The service ran it and it failed; the card shows the failure and a retry. */
  FAILED = 'failed',
}
