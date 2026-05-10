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

/**
 * Phrases inside a user message that imply they want an image generated
 * from an attached image (similar/recreate/like-this/etc.). Used to override
 * AUTO routing when a user attaches an image.
 */
export const IMAGE_INTENT_PHRASES: ReadonlyArray<string> = [
  'similar',
  'like this',
  'recreate',
  'reproduce',
  'copy',
  'same style',
  'identical',
  'match',
  'imitate',
  'version of this',
  'based on this',
  'inspired by',
  'variation',
  'modify this',
  'edit this',
  'change this',
  'transform this',
  'convert this',
  'make this',
  'redo this',
  'similar to this',
  'like the attached',
  'same as this',
  'generate from this',
  'create from this',
  'remake',
  'generate similar',
  'create similar',
  'generate like',
  'looks like this',
  'style of this',
  'another like this',
  'one more like',
  'same kind',
  'same type',
  'replicate',
];
