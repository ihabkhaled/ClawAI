export const THREAD_SNAPSHOT_SCHEMA_VERSION = 1;
export const THREAD_SNAPSHOT_MAX_MESSAGES = 2_000;
export const THREAD_SNAPSHOT_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Attachment text in a snapshot (rule 42). A Thread is written from the chat, and a file the
 * owner attached is part of that chat: its extracted text (document, OCR, transcript) travels
 * with the turn it was attached to, never its bytes. It counts toward the byte cap above.
 */
/** At most this many of the newest attached files are read from file-service per snapshot. */
export const THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES = 50;
/** Files read from file-service at once, so a long thread does not flood it. */
export const THREAD_SNAPSHOT_ATTACHMENT_FETCH_CONCURRENCY = 8;
/** One file's text above this is kept by its beginning and end, the cut marked. */
export const THREAD_SNAPSHOT_ATTACHMENT_MAX_CHARS = 100_000;
/** Share of a shortened file's kept characters taken from its beginning. */
export const THREAD_SNAPSHOT_ATTACHMENT_HEAD_SHARE = 0.7;
/** Bytes held back from the attachment budget for the omission note. */
export const THREAD_SNAPSHOT_ATTACHMENT_NOTE_RESERVE_BYTES = 512;

/** Text that looks like a credential; a message or attached file carrying it is left out. */
export const THREAD_SNAPSHOT_SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*[^\s,;]+/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bsk-(?:live|proj|ant)-[A-Za-z0-9_-]{12,}/i,
];

/** Bytes `"attachments":[]` plus its leading comma add to a message's JSON. */
export const THREAD_SNAPSHOT_ATTACHMENTS_KEY_BYTES = Buffer.byteLength(',"attachments":[]', 'utf8');
