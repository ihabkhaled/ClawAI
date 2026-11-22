/** A repeated message shorter than this ("Ok", "Continue") is kept: only long repeats are regenerations. */
export const FIT_DUPLICATE_MIN_CHARS = 200;

/** Every kept message gets at least this many characters before the rest is shared out. */
export const FIT_MIN_CHARS_PER_MESSAGE = 160;

/** Below this share a message says nothing; older messages are omitted instead (and the note says so). */
export const FIT_FLOOR_CHARS_PER_MESSAGE = 40;

/** An owner turn carries the intent and the corrections, so it weighs this much more than a reply. */
export const FIT_USER_WEIGHT = 2;

/** The newest message weighs this much more than the oldest (later turns refine earlier ones). */
export const FIT_RECENCY_BOOST = 1;

/** A condensed message keeps this share of its budget from its beginning, the rest from its end. */
export const FIT_HEAD_SHARE = 0.6;

/** Put around the count of characters cut from the middle of a condensed message. */
export const FIT_OMITTED_MARKER_LEAD = '\n[… ';
export const FIT_OMITTED_MARKER_TAIL = ' characters omitted to fit the model window …]\n';
