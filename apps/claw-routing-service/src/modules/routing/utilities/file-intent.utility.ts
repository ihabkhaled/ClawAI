import {
  FILE_INTENT_CREATE_VERBS,
  FILE_INTENT_DELIVERY_VERBS,
  FILE_INTENT_EXTENSION,
  FILE_INTENT_FOR_ME,
  FILE_INTENT_LEADING_FORMAT_WORDS,
  FILE_INTENT_LEADING_NAMED_FILE,
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
 * - an unambiguous format acronym as the very first word ("pdf: a guide to
 *   sleep", "xlsx budget tracker") — a terse, verb-less shorthand real users
 *   type. Only office/data acronyms qualify: "html: how do I center a div"
 *   or "zip codes in cairo" are questions, not files;
 * - a soft format word (markdown, docs, report...) with a delivery verb.
 * A format word inside a negation ("not in markdown") never counts.
 */
export function detectFileIntent(message: string): FileIntentResult {
  const lower = message.toLowerCase();
  const words = tokenize(lower);
  const negated = negatedIndexes(words);
  const indexesOf = (list: readonly string[]): number[] =>
    words.flatMap((word, index) =>
      !negated.has(index) && list.includes(stripPunctuation(word)) ? [index] : [],
    );

  const phrase = FILE_INTENT_PHRASES.some((p) => lower.includes(p));
  const extension = FILE_INTENT_EXTENSION.test(lower);
  const strongAt = indexesOf(FILE_INTENT_STRONG_WORDS);
  const soft = indexesOf(FILE_INTENT_SOFT_WORDS).length > 0;
  const deliverAt = indexesOf(FILE_INTENT_DELIVERY_VERBS);
  const verbAt = [...indexesOf(FILE_INTENT_CREATE_VERBS), ...deliverAt];
  // "zip" is both a format and a verb; one token cannot be both halves of the
  // pair, or "zip codes in cairo" is a file request.
  const strong = strongAt.length > 0;
  const strongWithVerb = strongAt.some((s) => verbAt.some((v) => v !== s));
  const deliver = deliverAt.length > 0;
  const leadingWord = words.at(0);
  const leadingStrong =
    leadingWord !== undefined &&
    !negated.has(0) &&
    (FILE_INTENT_LEADING_FORMAT_WORDS.includes(stripPunctuation(leadingWord)) ||
      opensWithNamedFile(words));

  if (FILE_INTENT_QUESTION.test(lower) && !FILE_INTENT_FOR_ME.test(lower)) {
    return { isFileRequest: false, reason: 'none' };
  }
  if (phrase) return { isFileRequest: true, reason: 'phrase' };
  if (extension) return { isFileRequest: true, reason: 'extension' };
  if (strong && strongWithVerb) return { isFileRequest: true, reason: 'strong_word_with_verb' };
  if (leadingStrong) return { isFileRequest: true, reason: 'leading_strong_word' };
  return soft && deliver ? { isFileRequest: true, reason: 'soft_word_with_delivery_verb' } : { isFileRequest: false, reason: 'none' };
}

/**
 * Splits a message into words with `Intl.Segmenter`, not the old
 * `[a-z0-9'.-]` regex, which matched only Latin/ASCII characters and
 * silently dropped every Arabic, Chinese, Hindi, Japanese, Russian or Thai
 * word. A message could carry the literal format name ("pdf" in "اعمل لي
 * ملف PDF") while its own-language verb ("اعمل") never reached `has()` below
 * — the message needed an English verb to route to file generation, and
 * never had one (F6, 2026-09-24).
 *
 * `Intl.Segmenter`'s dictionary-based word breaking is needed for Chinese,
 * Japanese and Thai, which write with no spaces between words at all. It
 * also splits a hyphenated word ("fais-moi", "one-pager") into two tokens,
 * so adjacent word segments joined only by a bare hyphen are re-merged into
 * one token below, matching the old tokenizer's behaviour for those.
 */
function tokenize(lower: string): string[] {
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(lower)];
  const words: string[] = [];
  let i = 0;
  while (i < segments.length) {
    const current = segments.at(i);
    if (current === undefined) break;
    if (!current.isWordLike) {
      i += 1;
      continue;
    }
    let token = current.segment;
    let next = i + 1;
    for (;;) {
      const hyphen = segments.at(next);
      const after = segments.at(next + 1);
      if (hyphen === undefined || after === undefined) break;
      if (hyphen.segment !== '-' || !after.isWordLike) break;
      token += `-${after.segment}`;
      next += 2;
    }
    words.push(token);
    i = next;
  }
  return words;
}

/** "json file with…", "markdown file of…": a named file and what goes in it. */
function opensWithNamedFile(words: readonly string[]): boolean {
  const [format, file, content] = words.map(stripPunctuation);
  const { formats, files, contentWords } = FILE_INTENT_LEADING_NAMED_FILE;
  return (
    format !== undefined &&
    file !== undefined &&
    content !== undefined &&
    formats.includes(format) &&
    files.includes(file) &&
    contentWords.includes(content)
  );
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
