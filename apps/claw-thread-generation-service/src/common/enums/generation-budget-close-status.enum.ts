export enum GenerationBudgetCloseStatus {
  FINALIZED = 'FINALIZED',
  RELEASED = 'RELEASED',
  /** The platform failed the job with no draft: auth refunds the Free meter money and the lifetime hold. */
  PLATFORM_FAILED = 'PLATFORM_FAILED',
}
