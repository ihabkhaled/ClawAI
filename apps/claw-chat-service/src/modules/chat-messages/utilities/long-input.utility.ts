import {
  LONG_INPUT_BOUNDARY_SEARCH_SHARE,
  LONG_INPUT_EACH_PART_SYSTEM_PROMPT,
  LONG_INPUT_MAX_PARTS,
  LONG_INPUT_MERGE_SYSTEM_PROMPT,
  LONG_INPUT_MODE_JUDGE_PROMPT,
  LONG_INPUT_NOTES_HEADER,
  LONG_INPUT_PART_BOUNDARIES,
  LONG_INPUT_READER_SYSTEM_PROMPT,
  LONG_INPUT_SAMPLED_NOTE,
} from '../constants/long-input.constants';
import type { LongInputPlan } from '../types/long-input.types';
import { fenceUntrusted, sanitizeUntrustedText } from './untrusted-fence.utility';

/** Where a part may end: the last natural boundary in its final stretch, else the hard limit. */
function cutPoint(text: string, start: number, size: number): number {
  const end = Math.min(text.length, start + size);
  if (end === text.length) {
    return end;
  }
  const floor = end - Math.floor(size * LONG_INPUT_BOUNDARY_SEARCH_SHARE);
  for (const boundary of LONG_INPUT_PART_BOUNDARIES) {
    const at = text.lastIndexOf(boundary, end - boundary.length);
    if (at >= floor && at > start) {
      return at + boundary.length;
    }
  }
  return end;
}

/** The text cut into consecutive parts of at most `partChars`, each ending on a natural boundary when one is near. */
export function splitIntoParts(text: string, partChars: number): string[] {
  const size = Math.max(1, Math.floor(partChars));
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = cutPoint(text, start, size);
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
}

/** Every part when they are few enough; else `max` parts spread evenly, always the first and the last. */
export function planParts(
  parts: readonly string[],
  max: number = LONG_INPUT_MAX_PARTS,
): LongInputPlan {
  if (parts.length <= max) {
    return { total: parts.length, picked: parts.map((text, index) => ({ index, text })) };
  }
  const step = (parts.length - 1) / (max - 1);
  const indexes = new Set<number>();
  for (let k = 0; k < max; k += 1) {
    indexes.add(Math.round(k * step));
  }
  return {
    total: parts.length,
    picked: [...indexes]
      .sort((a, b) => a - b)
      .map((index) => ({ index, text: parts.at(index) ?? '' })),
  };
}

function fenced(tag: string, attributes: Array<[string, string]>, text: string): string {
  return fenceUntrusted({
    tag,
    attributes,
    body: sanitizeUntrustedText(text).replaceAll(`</${tag}`, `< /${tag}`),
  });
}

/** The prompt for one part: what the user asked, then the part as fenced data. */
export function buildPartPrompt(
  request: string,
  filename: string,
  part: number,
  total: number,
  text: string,
): string {
  return [
    LONG_INPUT_READER_SYSTEM_PROMPT,
    fenced('user_request', [], request),
    fenced(
      'document_part',
      [
        ['name', filename.replaceAll('"', "'")],
        ['part', `${String(part)} of ${String(total)}`],
      ],
      text,
    ),
  ].join('\n\n');
}

/** The prompt that carries the request out on one part (each-part mode). */
export function buildEachPartPrompt(
  request: string,
  filename: string,
  part: number,
  total: number,
  text: string,
): string {
  return [
    LONG_INPUT_EACH_PART_SYSTEM_PROMPT,
    fenced('user_request', [], request),
    fenced(
      'document_part',
      [
        ['name', filename.replaceAll('"', "'")],
        ['part', `${String(part)} of ${String(total)}`],
      ],
      text,
    ),
  ].join('\n\n');
}

/** The judge prompt: notes or each part. */
export function buildModeJudgePrompt(request: string): string {
  return [LONG_INPUT_MODE_JUDGE_PROMPT, fenced('user_request', [], request)].join('\n\n');
}

/** `{"eachPart": true|false}`; null when unreadable, so the next judge is asked. */
export function parseEachPartVerdict(raw: string): boolean | null {
  const match = /"eachPart"\s*:\s*(true|false)/u.exec(raw);
  return match === null ? null : match[1] === 'true';
}

/** The prompt that merges notes that do not fit yet. */
export function buildMergePrompt(request: string, filename: string, notes: string): string {
  return [
    LONG_INPUT_MERGE_SYSTEM_PROMPT,
    fenced('user_request', [], request),
    fenced('reading_notes', [['name', filename.replaceAll('"', "'")]], notes),
  ].join('\n\n');
}

/** What replaces the oversized file's text in the answering prompt. */
export function formatReadingNotes(
  filename: string,
  plan: LongInputPlan,
  notes: readonly string[],
  merged = false,
): string {
  const header = LONG_INPUT_NOTES_HEADER.replace('{NAME}', filename).replace(
    '{PARTS}',
    String(plan.total),
  );
  const sampled =
    plan.picked.length < plan.total
      ? `\n${LONG_INPUT_SAMPLED_NOTE.replace('{READ}', String(plan.picked.length)).replace('{PARTS}', String(plan.total))}`
      : '';
  const body = merged
    ? (notes[0] ?? '').trim()
    : notes
        .map(
          (note, k) =>
            `--- Part ${String((plan.picked.at(k)?.index ?? k) + 1)} of ${String(plan.total)} ---\n${note.trim()}`,
        )
        .join('\n\n');
  return `${header}${sampled}\n\n${body}`;
}
