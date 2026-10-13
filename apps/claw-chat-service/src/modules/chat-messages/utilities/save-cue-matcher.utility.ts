import {
  CUE_ANCHOR,
  CUE_ARABIC_PREFIX,
  CUE_ARABIC_SCRIPT,
  CUE_LEFT_BOUNDARY,
  CUE_MESSAGE_TAIL,
  CUE_RIGHT_BOUNDARY,
  CUE_UNSPACED_SCRIPT,
  CUE_WEAK_MIN_DISTINCT,
  CUE_WHOLE_WORD_MARK,
} from '../constants/save-cue-matcher.constants';

/**
 * Lowercases and folds the spelling variants that made a cue miss: Arabic
 * diacritics and alef forms, curly apostrophes, Persian ZWNJ (a half-space: it
 * becomes a space, so a ZWNJ-joined verb reads like its spaced spelling) and runs
 * of spaces. Cues are folded the same way, so a cue is written once, in plain form.
 */
export function normalizeForCues(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('‌', ' ')
    .replaceAll(/[ً-ٰٟـ‍]/gu, '')
    .replaceAll(/[أإآ]/gu, 'ا')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replaceAll(/[‘’]/gu, "'")
    .replaceAll(/\s+/gu, ' ');
}

function escapeForRegExp(word: string): string {
  return word.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

/**
 * One cue as a pattern. Scripts written with spaces match at a word start (and,
 * when the cue ends in `$`, at a word end); Arabic-script cues also accept a glued
 * one-letter prefix. Unspaced scripts (Chinese, Japanese, Thai) match as plain text.
 */
export function cuePattern(cue: string): string {
  const whole = cue.endsWith(CUE_WHOLE_WORD_MARK);
  const body = normalizeForCues(whole ? cue.slice(0, -1) : cue);
  const escaped = escapeForRegExp(body);
  if (CUE_UNSPACED_SCRIPT.test(body)) return escaped;
  const left = CUE_ARABIC_SCRIPT.test(body)
    ? `${CUE_LEFT_BOUNDARY}${CUE_ARABIC_PREFIX}`
    : CUE_LEFT_BOUNDARY;
  return `${left}${escaped}${whole ? CUE_RIGHT_BOUNDARY : ''}`;
}

function alternation(words: readonly string[]): string {
  return words.map((word) => cuePattern(word)).join('|');
}

/**
 * The one place a cue pattern becomes a RegExp. Every source is built here from
 * escaped cue text and the boundary constants, never from user input.
 */
function compileCuePattern(source: string, flags: string): RegExp {
  return RegExp(source, flags);
}

/** One alternation over the folded cues: a single linear scan, however long the message. */
export function cueRegExp(words: readonly string[]): RegExp {
  return compileCuePattern(alternation(words), 'u');
}

/** Cues that count only at the start of the message or after punctuation or a space. */
export function anchoredCueRegExp(words: readonly string[]): RegExp {
  return compileCuePattern(`${CUE_ANCHOR}\\s*(?:${alternation(words)})`, 'u');
}

/** Global, so the caller can count the different generic words a message holds. */
export function weakCueRegExp(words: readonly string[]): RegExp {
  return compileCuePattern(alternation(words), 'gu');
}

/**
 * The whole message is one of the words, optionally followed by one object word
 * ("save that."), then only punctuation. `objectRequired` makes the object a must.
 */
export function wholeMessageRegExp(
  words: readonly string[],
  objects: readonly string[],
  objectRequired: boolean,
): RegExp {
  const verbs = words.map((word) => escapeForRegExp(normalizeForCues(word))).join('|');
  const things = objects.map((word) => escapeForRegExp(normalizeForCues(word))).join('|');
  const object = `(?: (?:${things}))${objectRequired ? '' : '?'}`;
  return compileCuePattern(`^ ?(?:please )?(?:${verbs})${object}${CUE_MESSAGE_TAIL}`, 'u');
}

/** Whether at least CUE_WEAK_MIN_DISTINCT different generic words appear in the folded text. */
export function hasEnoughWeakCues(weak: RegExp, folded: string): boolean {
  const found = folded.match(weak);
  return found !== null && new Set(found).size >= CUE_WEAK_MIN_DISTINCT;
}
