/** The part of a Thread generation a failure happened in (ADR-181). */
export enum ThreadFailurePhase {
  QUEUE = 'QUEUE',
  SNAPSHOT = 'SNAPSHOT',
  RESEARCH = 'RESEARCH',
  AUTHOR = 'AUTHOR',
  CITATIONS = 'CITATIONS',
  CONSENSUS = 'CONSENSUS',
  JUDGE = 'JUDGE',
  CRITIC = 'CRITIC',
  FINALIZE = 'FINALIZE',
}
