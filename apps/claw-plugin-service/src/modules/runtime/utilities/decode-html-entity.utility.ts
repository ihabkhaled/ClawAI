import {
  HTML_ENTITY_MAX_LENGTH,
  HTML_MAX_CODE_POINT,
  HTML_NAMED_ENTITIES,
} from '../constants/html-text.constants';

/**
 * The text for the entity that starts at text[start] (an ampersand), and how many characters it
 * used. Unknown or malformed entities are left as the literal ampersand.
 */
export function decodeHtmlEntity(text: string, start: number): { value: string; length: number } {
  // Look only a few characters ahead: scanning to the end of the page for every ampersand would be quadratic.
  const window = text.slice(start + 1, start + 1 + HTML_ENTITY_MAX_LENGTH);
  const offset = window.indexOf(';');
  if (offset === -1) return { value: '&', length: 1 };
  const body = window.slice(0, offset);
  const length = offset + 2;
  const named = HTML_NAMED_ENTITIES.get(body.toLowerCase());
  if (named !== undefined) return { value: named, length };
  const hex = /^#x([0-9a-f]{1,6})$/i.exec(body);
  const decimal = /^#([0-9]{1,7})$/.exec(body);
  const code = hex?.[1] === undefined ? Number(decimal?.[1]) : Number.parseInt(hex[1], 16);
  return Number.isInteger(code) && code > 0 && code <= HTML_MAX_CODE_POINT
    ? { value: String.fromCodePoint(code), length }
    : { value: '&', length: 1 };
}
