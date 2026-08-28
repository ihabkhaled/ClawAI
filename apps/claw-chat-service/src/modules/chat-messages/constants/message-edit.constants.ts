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
