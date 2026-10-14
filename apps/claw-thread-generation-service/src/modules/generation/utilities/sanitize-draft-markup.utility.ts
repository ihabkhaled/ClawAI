import {
  CITATION_SEPARATOR_PATTERN,
  STRAY_SCRIPT_TAG_PATTERN,
} from '../constants/generation.constants';

/**
 * Reads `[[a], [b]]` at `start` (the first of two opening brackets). Returns the single citations
 * and the index after the group, or null when the text is not a doubled group.
 */
function readDoubledGroup(text: string, start: number): { items: string[]; end: number } | null {
  const items: string[] = [];
  let index = start + 1;
  while (text.charAt(index) === '[') {
    const close = text.indexOf(']', index);
    if (close === -1) return null;
    const inner = text.slice(index + 1, close);
    if (inner.length === 0 || inner.includes('[')) return null;
    items.push(`[${inner}]`);
    index = close + 1;
    index += CITATION_SEPARATOR_PATTERN.exec(text.slice(index))?.[0].length ?? 0;
  }
  return items.length > 0 && text.charAt(index) === ']' ? { items, end: index + 1 } : null;
}

function flattenCitationGroups(text: string): string {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const group = text.startsWith('[[', index) ? readDoubledGroup(text, index) : null;
    if (group) {
      result += group.items.join(' ');
      index = group.end;
    } else {
      result += text.charAt(index);
      index += 1;
    }
  }
  return result;
}

/**
 * Cleans markup models add around citations: stray `<sup>`/`</sup>`/`<sub>` tags are removed and a
 * doubled citation group becomes plain adjacent citations. Idempotent.
 */
export function sanitizeDraftMarkup(markdown: string): string {
  return flattenCitationGroups(markdown.replaceAll(STRAY_SCRIPT_TAG_PATTERN, '')).trimEnd();
}
