/**
 * Successful passes one Thread may run per rolling day (ADR-189). Only a pass that produced a
 * formatted article counts; failed passes and skips (already typeset, guard refusals) are free.
 */
export const FORMAT_PASSES_PER_DAY = 3;
/** Cost bound on free skips: model calls (formatted or skipped) one Thread may cause per rolling day. */
export const FORMAT_ATTEMPTS_PER_DAY = 10;
export const FORMAT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** A pass is one cheap model call plus a retry: the generation service bounds it at about 6 minutes. */
export const FORMAT_REQUEST_TIMEOUT_MS = 6 * 60 * 1000;
/** Mirrors the generation service's code for an article that is already well formed. */
export const FORMAT_ALREADY_PRETTY_CODE = 'FORMAT_ALREADY_PRETTY';
export const FORMAT_NOT_FOUND_MESSAGE = 'Publication not found';
export const FORMAT_DAILY_LIMIT_MESSAGE =
  'This Thread has used its formatting passes for today. Try again tomorrow.';
export const FORMAT_IN_PROGRESS_MESSAGE = 'A formatting pass is already running for this request';
export const FORMAT_NOT_FORMATTABLE_MESSAGE = 'This Thread has no generated article to format yet';
