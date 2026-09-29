import {
  BACK_REFERENCE_WORDS,
  CLAUSE_SPLIT,
  MARKDOWN_HEADING_LINE,
  NEGATION_SUBSTRINGS,
  NEGATION_WORDS,
  PARAGRAPH_SPLIT,
  PASTED_DOCUMENT_HEADINGS_MIN_CHARS,
  PASTED_DOCUMENT_MIN_CHARS,
  PASTED_DOCUMENT_MIN_HEADINGS,
  REQUEST_ENVELOPE_MAX_CHARS,
  SAVE_INTENT_PATTERNS,
  SAVE_TARGET_CONTEXT_WORDS,
  SAVE_TYPE_INSTRUCTION_WORDS,
  SAVE_TYPE_PREFERENCE_WORDS,
  SAVE_TYPE_SUMMARY_WORDS,
  STRUCTURAL_PARAGRAPH,
  TYPE_HINT_PAYLOAD_CHARS,
} from './generation-request.constants';
import type { SaveIntentMemoryType, SaveToContextIntent } from './generation-request.types';
import { SaveIntentTarget } from './save-intent-target.enum';

function words(text: string): string[] {
  const segments = new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text);
  return [...segments].filter((s) => s.isWordLike).map((s) => s.segment.toLowerCase());
}

function isNegated(clause: string): boolean {
  const lower = clause.toLowerCase();
  return NEGATION_SUBSTRINGS.some((negation) => lower.includes(negation))
    ? true
    : words(clause).some((word) => NEGATION_WORDS.has(word));
}

function isPastedDocument(message: string): boolean {
  if (message.length >= PASTED_DOCUMENT_MIN_CHARS) return true;
  const headings = message.match(MARKDOWN_HEADING_LINE)?.length ?? 0;
  return (
    headings >= PASTED_DOCUMENT_MIN_HEADINGS && message.length >= PASTED_DOCUMENT_HEADINGS_MIN_CHARS
  );
}

function isInstructionParagraph(paragraph: string): boolean {
  return (
    paragraph.trim().length > 0 &&
    paragraph.length <= REQUEST_ENVELOPE_MAX_CHARS &&
    !STRUCTURAL_PARAGRAPH.test(paragraph)
  );
}

/**
 * The instruction wrapped around a pasted body: its first paragraph ("Draw
 * this:"), and its last only when that points back at the body ("…of the
 * above"). Everything in between is material, not a request.
 */
function requestEnvelope(message: string): string {
  const paragraphs = message.split(PARAGRAPH_SPLIT).filter((p) => p.trim().length > 0);
  const first = paragraphs.at(0) ?? '';
  const last = paragraphs.length > 1 ? (paragraphs.at(-1) ?? '') : '';
  const kept: string[] = [];
  if (isInstructionParagraph(first)) kept.push(first);
  const lastLower = last.toLowerCase();
  if (isInstructionParagraph(last) && BACK_REFERENCE_WORDS.some((w) => lastLower.includes(w))) {
    kept.push(last);
  }
  return kept.join('\n');
}

function includesAny(lower: string, list: readonly string[]): boolean {
  return list.some((word) => lower.includes(word));
}

function memoryTypeOf(command: string, payload: string): SaveIntentMemoryType {
  const commandLower = command.toLowerCase();
  for (const [type, list] of [
    ['INSTRUCTION', SAVE_TYPE_INSTRUCTION_WORDS],
    ['PREFERENCE', SAVE_TYPE_PREFERENCE_WORDS],
    ['SUMMARY', SAVE_TYPE_SUMMARY_WORDS],
  ] as const) {
    if (includesAny(commandLower, list)) return type;
  }
  const hint = `${commandLower} ${payload.slice(0, TYPE_HINT_PAYLOAD_CHARS).toLowerCase()}`;
  if (includesAny(hint, SAVE_TYPE_INSTRUCTION_WORDS)) return 'INSTRUCTION';
  return includesAny(hint, SAVE_TYPE_PREFERENCE_WORDS) ? 'PREFERENCE' : 'FACT';
}

function matchSaveCommand(text: string): { command: string; rest: string } | null {
  const trimmed = text.trim();
  for (const pattern of SAVE_INTENT_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match !== null) {
      const rest = match.groups?.['rest'] ?? '';
      return { command: trimmed.slice(0, trimmed.length - rest.length), rest: rest.trim() };
    }
  }
  return null;
}

/**
 * "Save this as memory", "remember this", "add this to my context pack" — in
 * the 13 UI locales. The command must open the message, or be its whole last
 * paragraph ("<pasted notes>\n\nSave this as context"). Questions about
 * memory ("what do you remember?") never match.
 */
export function detectSaveToContextIntent(message: string): SaveToContextIntent | null {
  let found = matchSaveCommand(message);
  if (found === null) {
    const paragraphs = message.split(PARAGRAPH_SPLIT).filter((p) => p.trim().length > 0);
    const last = paragraphs.length > 1 ? (paragraphs.at(-1) ?? '') : '';
    const tail = last.length > 0 ? matchSaveCommand(last) : null;
    if (tail !== null && tail.rest.length === 0) {
      found = { command: tail.command, rest: paragraphs.slice(0, -1).join('\n\n').trim() };
    }
  }
  if (found === null) return null;
  const target = includesAny(found.command.toLowerCase(), SAVE_TARGET_CONTEXT_WORDS)
    ? SaveIntentTarget.CONTEXT_PACK
    : SaveIntentTarget.MEMORY;
  return { target, memoryType: memoryTypeOf(found.command, found.rest), content: found.rest };
}

/**
 * The part of a message that can be a request to GENERATE an image or a file.
 *
 * 1. A save/remember command is never a generation request → ''.
 * 2. A pasted document (long, or heading-structured) contributes only its
 *    instruction envelope, never its body.
 * 3. Clauses carrying a negation ("do not generate an image") are removed, in
 *    the 13 UI locales; the positive clause beside one survives.
 */
export function generationRequestText(message: string): string {
  if (detectSaveToContextIntent(message) !== null) return '';
  const candidate = isPastedDocument(message) ? requestEnvelope(message) : message;
  return candidate
    .split(CLAUSE_SPLIT)
    .filter((clause) => clause.trim().length > 0 && !isNegated(clause))
    .join('. ')
    .trim();
}
