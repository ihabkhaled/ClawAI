/**
 * Refusals for editing a message.
 *
 * The code is the stable machine value the frontend maps; the message key is
 * what the reader is shown. Keeping them separate is what stopped the quota
 * refusal from rendering in English regardless of locale — the code had been
 * set to a message key, so nothing matched.
 */
export const MESSAGE_NOT_EDITABLE_CODE = 'MESSAGE_NOT_EDITABLE';
export const MESSAGE_NOT_EDITABLE_MESSAGE_KEY = 'chat.errors.messageNotEditable';

export const MESSAGE_EDIT_UNCHANGED_CODE = 'MESSAGE_EDIT_UNCHANGED';
export const MESSAGE_EDIT_UNCHANGED_MESSAGE_KEY = 'chat.errors.messageEditUnchanged';

/**
 * Refusal when a regeneration cannot be tied back to a question.
 *
 * Only reachable for an assistant row with no recorded source and no user turn
 * before it in the thread — a shape that should not exist, but refusing beats
 * publishing an id the consumer will silently fail to match.
 */
export const REGENERATION_TARGET_MISSING_CODE = 'REGENERATION_TARGET_MISSING';
export const REGENERATION_TARGET_MISSING_MESSAGE_KEY = 'chat.errors.regenerationTargetMissing';
