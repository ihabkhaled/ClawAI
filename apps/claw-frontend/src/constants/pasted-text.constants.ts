/**
 * A paste longer than this becomes a text attachment instead of composer text
 * (ADR-219, like claude.ai's "pasted text" chip). Big inline text was capped at
 * the message limit and made the textarea unusable; as a file it can be
 * millions of characters and the model gets the parts relevant to the question.
 */
export const PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS = 20_000;

/** "Pasted text 1.txt", "Pasted text 2.txt", … — numbered per composer. */
export const PASTED_TEXT_FILENAME_PREFIX = 'Pasted text ';
export const PASTED_TEXT_FILE_EXTENSION = '.txt';

/** file-service's allow-list matches the bare type; a Blob of a string is UTF-8. */
export const PASTED_TEXT_MIME_TYPE = 'text/plain';
