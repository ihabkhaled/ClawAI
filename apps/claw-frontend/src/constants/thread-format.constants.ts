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

/** The refusal the format route returns when the Thread has no generated article yet. */
export const THREAD_FORMAT_NOT_FORMATTABLE_CODE = 'THREAD_FORMAT_NOT_FORMATTABLE';

/** Every skip code starts with this; the ones below are known, any other is shown with its code. */
export const THREAD_FORMAT_CODE_PREFIX = 'FORMAT_';

/** `FORMAT_*` skip code to its friendly sentence under `threadReview` (a skip is safe, not an error). */
export const THREAD_FORMAT_CODE_KEYS: Readonly<Record<string, string>> = {
  FORMAT_ALREADY_PRETTY: 'threadReview.formatAlreadyPretty',
  FORMAT_SKIPPED_BUDGET: 'threadReview.formatSkippedBudget',
  FORMAT_FAILED: 'threadReview.formatFailed',
  FORMAT_REPLY_INVALID: 'threadReview.formatReplyInvalid',
  FORMAT_MODEL_ERROR: 'threadReview.formatModelError',
  FORMAT_EMPTY: 'threadReview.formatEmpty',
  FORMAT_RAW_HTML: 'threadReview.formatRawHtml',
  FORMAT_CITATION_LOST: 'threadReview.formatCitationLost',
  FORMAT_CITATION_ADDED: 'threadReview.formatCitationAdded',
  FORMAT_NUMBER_CHANGED: 'threadReview.formatNumberChanged',
  FORMAT_URL_ADDED: 'threadReview.formatUrlAdded',
  FORMAT_LENGTH_DRIFT: 'threadReview.formatLengthDrift',
  FORMAT_HEADING_LANGUAGE: 'threadReview.formatHeadingLanguage',
  FORMAT_STRUCTURE: 'threadReview.formatStructure',
  FORMAT_TABLE_LOST: 'threadReview.formatTableLost',
};

/** A skipped formatting step reads as neutral information, never in the error colour. */
export const THREAD_FORMAT_SKIP_TONE = 'text-blue-700 dark:text-info';
