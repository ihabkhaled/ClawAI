/** How one translation attempt ended, as the worker's pass counts it. */
export enum TranslationOutcome {
  READY = 'READY',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}
