/**
 * Short canned follow-up phrases that indicate the user wants the previous
 * generation to repeat (image, file, etc.). Used by chat-messages.service
 * to short-circuit AUTO routing when the prior turn was a generation.
 */
export const SHORT_FOLLOW_UP_EXACT_MATCHES: ReadonlyArray<string> = [
  'again',
  'one more',
  'another one',
  'do it again',
  'retry',
  'regenerate',
  'redo',
  'more',
];

export const IMAGE_FOLLOW_UP_PREFIXES: ReadonlyArray<string> = [
  'another',
  'one more',
  'do another',
  'make another',
  'generate another',
  'create another',
];

export const FILE_FOLLOW_UP_PREFIXES: ReadonlyArray<string> = ['another', 'one more', 'do another'];

export const SHORT_FOLLOW_UP_MAX_LENGTH = 100;

// IMAGE_INTENT_PHRASES was removed 2026-09-26: an attached-image edit is now
// decided by `classifyImageIntent` in `@claw/shared-utilities` (image-intent/),
// shared with routing-service.
