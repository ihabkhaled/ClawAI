/**
 * Every URL in the message gets crawled — up to this bound.
 *
 * The bound exists because the input is an untrusted prompt: a pasted list of
 * two hundred links would otherwise become two hundred outbound crawls from
 * one message, which is a denial of service we would be running against
 * ourselves. Ten is far above any real message and far below that.
 */
export const PROMPT_URL_MAX_PER_MESSAGE = 10;
