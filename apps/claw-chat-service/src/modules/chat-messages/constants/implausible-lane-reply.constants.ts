/** A prompt at least this long is a real question, not a one-word exchange. */
export const LANE_LONG_PROMPT_MIN_CHARS = 200;

/** A reply this short (about one token) cannot answer a long prompt. */
export const LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS = 5;

export const LANE_IMPLAUSIBLY_SHORT_REPLY_CODE = 'LANE_REPLY_IMPLAUSIBLY_SHORT';

export const LANE_IMPLAUSIBLY_SHORT_REPLY_MESSAGE =
  'This model returned only a fragment instead of an answer. Try it again.';
