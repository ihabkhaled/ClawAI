/**
 * How many files one request may carry.
 *
 * Ten, matching the limit Compare and normal chat already enforce inline. It
 * lives here so the seven labs that are gaining attachments cannot each pick
 * their own number, which is how Compare and chat came to state the same rule
 * in two places.
 */
export const MAX_ATTACHMENTS_PER_REQUEST = 10;
