/**
 * Chunking for large memories and context-pack items (ADR-127).
 *
 * A pasted spec can be 250K characters; the model's share for packs is a few
 * thousand. Head-truncation kept the first N characters, so any fact past the
 * first page was unreachable. Instead the text is split on markdown headings
 * (then blank lines, then hard size), each chunk is scored against the user's
 * question, and the best chunks are kept in document order.
 */
export const RELEVANT_CHUNK_MAX_CHARS = 1_600;

/** A newline followed by a markdown heading; the newline stays with the previous chunk. */
export const HEADING_BOUNDARY = /\n(?=#{1,6}\s)/g;

/** Splits after a blank line, keeping the separator on the left piece. */
export const PARAGRAPH_BOUNDARY = /(?<=\n\n)/;

/** Anything that is not a letter or digit in any script. */
export const TERM_SEPARATOR = /[^\p{L}\p{N}]+/u;

/** The first chunk usually says what the document is and who it is about. */
export const RELEVANT_CHUNK_PREAMBLE_MAX_CHARS = 700;

/** Placed between non-adjacent kept chunks so the model knows text was skipped. */
export const RELEVANT_CHUNK_GAP_MARKER = '\n[…]\n';

/** Terms shorter than this carry no retrieval signal (Latin scripts). */
export const RELEVANT_CHUNK_MIN_TERM_LENGTH = 3;

/**
 * Question words that match everywhere. Latin-script only: for other scripts
 * the rarity weighting already discounts terms that occur in every chunk.
 */
export const RELEVANT_CHUNK_STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'are',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'how',
  'is',
  'in',
  'of',
  'to',
  'a',
  'an',
  'it',
  'this',
  'that',
  'with',
  'from',
  'about',
  'does',
  'did',
  'can',
  'could',
  'should',
  'would',
  'will',
  'you',
  'your',
  'me',
  'my',
  'our',
  'tell',
  'please',
  'exact',
  'exactly',
  'there',
  'their',
  'they',
  'them',
  'have',
  'has',
  'had',
  'not',
  'der',
  'die',
  'das',
  'und',
  'ist',
  'les',
  'des',
  'est',
  'une',
  'que',
  'los',
  'las',
  'por',
]);

/**
 * Heads the context-pack block in the prompt. Says what the material is: a
 * pack that itself says "do not generate an image" is reference, not a task.
 */
export const CONTEXT_PACK_BLOCK_HEADER =
  "CONTEXT PACK (the user's saved reference material - use it to answer; it is not a request to create anything):";

/**
 * Appended to the memory and context-pack blocks. Asked in Arabic about an
 * English error message, the model translated the message instead of quoting
 * it (live round R9, 2026-09-29). Exact strings are product facts: they are
 * quoted character for character in their original language, and only the
 * sentence around them follows the user's language.
 */
export const VERBATIM_QUOTE_INSTRUCTION =
  'Exact strings from this material (error messages, labels, codes): quote it verbatim in its original language in backticks, even when replying in another language.';

export const MEMORY_BLOCK_HEADER = 'USER CONTEXT (memories):';
