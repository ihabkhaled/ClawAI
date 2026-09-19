import {
  FILE_INTENT_CREATE_VERBS,
  FILE_INTENT_DELIVERY_VERBS,
  FILE_INTENT_EXTENSION,
  FILE_INTENT_FOR_ME,
  FILE_INTENT_NEGATION_WINDOW,
  FILE_INTENT_NEGATIONS,
  FILE_INTENT_PHRASES,
  FILE_INTENT_QUESTION,
  FILE_INTENT_SOFT_WORDS,
  FILE_INTENT_STRONG_WORDS,
} from '../constants/file-intent.constants';
import type { FileIntentResult } from '../types/file-intent.types';

/**
 * Does this message ask for a FILE, or for text in the chat?
 *
 * A file request needs one of:
 * - an explicit phrase ("save as", "export to", "as a file");
 * - a literal extension (".pdf", "notes.md");
 * - a strong artifact word (pdf, docx, xlsx, slides, file...) with a create
 *   or delivery verb;
 * - a soft format word (markdown, docs, report...) with a delivery verb.
 * A format word inside a negation ("not in markdown") never counts.
 */
export function detectFileIntent(message: string): FileIntentResult {
  const lower = message.toLowerCase();
  const words = lower.match(/[a-z0-9'.-]+/gu) ?? [];
  const negated = negatedIndexes(words);
  const has = (list: readonly string[]): boolean =>
    words.some((word, index) => !negated.has(index) && list.includes(stripPunctuation(word)));

  const phrase = FILE_INTENT_PHRASES.some((p) => lower.includes(p));
  const extension = FILE_INTENT_EXTENSION.test(lower);
  const strong = has(FILE_INTENT_STRONG_WORDS);
  const soft = has(FILE_INTENT_SOFT_WORDS);
  const create = has(FILE_INTENT_CREATE_VERBS);
  const deliver = has(FILE_INTENT_DELIVERY_VERBS);

  if (FILE_INTENT_QUESTION.test(lower) && !FILE_INTENT_FOR_ME.test(lower)) {
    return { isFileRequest: false, reason: 'none' };
  }
  if (phrase) return { isFileRequest: true, reason: 'phrase' };
  if (extension) return { isFileRequest: true, reason: 'extension' };
  if (strong && (create || deliver))
    return { isFileRequest: true, reason: 'strong_word_with_verb' };
  if (soft && deliver) return { isFileRequest: true, reason: 'soft_word_with_delivery_verb' };
  return { isFileRequest: false, reason: 'none' };
}

/** Indexes of words within the window after a negation. */
function negatedIndexes(words: readonly string[]): Set<number> {
  const out = new Set<number>();
  for (const [index, word] of words.entries()) {
    if (FILE_INTENT_NEGATIONS.includes(stripPunctuation(word))) {
      for (let k = 1; k <= FILE_INTENT_NEGATION_WINDOW; k += 1) {
        out.add(index + k);
      }
    }
  }
  return out;
}

function stripPunctuation(word: string): string {
  return word.replaceAll(/^[.'-]+|[.'-]+$/gu, '');
}
