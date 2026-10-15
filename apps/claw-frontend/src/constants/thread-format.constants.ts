/** The spend cap sent when the owner accepts a formatted version: it pays for the re-review (USD). */
export const THREAD_FORMAT_ACCEPT_CAP_USD = 0.5;

/** Error codes the format-preview route returns (threads-service `FormatPassErrorCode`). */
export const THREAD_FORMAT_DAILY_LIMIT_CODE = 'THREAD_FORMAT_DAILY_LIMIT';
export const THREAD_FORMAT_IN_PROGRESS_CODE = 'THREAD_FORMAT_IN_PROGRESS';

/** The skipped code for an article that is already well formatted. */
export const THREAD_FORMAT_ALREADY_PRETTY_CODE = 'FORMAT_ALREADY_PRETTY';

export enum ThreadFormatView {
  Before = 'before',
  After = 'after',
}
