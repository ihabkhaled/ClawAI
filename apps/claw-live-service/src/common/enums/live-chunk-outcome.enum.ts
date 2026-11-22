/** What one 6 s audio chunk produced in the worker. */
export enum LiveChunkOutcome {
  /** Speech: a transcript segment was committed. */
  TEXT = 'TEXT',
  /** The provider heard no speech: a silence, not a failure. */
  SILENCE = 'SILENCE',
  /** STT failed after retries: a GAP marker, never invented text. */
  GAP = 'GAP',
}
