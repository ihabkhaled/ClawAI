/** Machine codes the format-preview route returns; the frontend translates them. */
export enum FormatPassErrorCode {
  DAILY_LIMIT = 'THREAD_FORMAT_DAILY_LIMIT',
  IN_PROGRESS = 'THREAD_FORMAT_IN_PROGRESS',
  NOT_FORMATTABLE = 'THREAD_FORMAT_NOT_FORMATTABLE',
}
