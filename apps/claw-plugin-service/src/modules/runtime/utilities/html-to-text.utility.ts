import {
  HTML_BLOCK_ELEMENTS,
  HTML_OPEN_ONLY_ELEMENTS,
  HTML_SKIPPED_ELEMENTS,
  HTML_TAG_NAME_MAX,
  HTML_TITLE_MAX,
} from '../constants/html-text.constants';
import { decodeHtmlEntity } from './decode-html-entity.utility';

function tagNameAt(lower: string, start: number): { name: string; closing: boolean } {
  let index = start + 1;
  const closing = lower.charAt(index) === '/';
  if (closing) index += 1;
  let name = '';
  while (index < lower.length && name.length < HTML_TAG_NAME_MAX) {
    const char = lower.charAt(index);
    if (!/[a-z0-9]/.test(char)) break;
    name += char;
    index += 1;
  }
  return { name, closing };
}

function collapse(text: string): string {
  return text
    .replaceAll(/[^\S\n]+/g, ' ')
    .replaceAll(/ ?\n ?/g, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

/** The text between <title> and </title>, if the page has one. */
function titleOf(html: string, lower: string): string {
  const open = lower.indexOf('<title');
  const from = open === -1 ? -1 : lower.indexOf('>', open);
  const close = from === -1 ? -1 : lower.indexOf('</title', from);
  return close === -1
    ? ''
    : collapse(html.slice(from + 1, close).replaceAll(/\s+/g, ' ')).slice(0, HTML_TITLE_MAX);
}

/**
 * A readable plain-text rendering of an HTML page, in one pass with no regex over the whole
 * document (so a hostile page cannot make it slow). Scripts, styles and embeds are dropped,
 * block elements become line breaks, and entities are decoded. The title, when present, leads.
 * The result is still untrusted text; it only has no markup left to hide anything in.
 */
export function htmlToText(html: string): string {
  const lower = html.toLowerCase();
  const out: string[] = [];
  let index = 0;
  while (index < html.length) {
    const char = html.charAt(index);
    if (char === '&') {
      const entity = decodeHtmlEntity(html, index);
      out.push(entity.value);
      index += entity.length;
    } else if (char === '<') {
      index = skipTag(html, lower, index, out);
    } else {
      out.push(char);
      index += 1;
    }
  }
  const title = titleOf(html, lower);
  const body = collapse(out.join(''));
  return title === '' || body.startsWith(title) ? body : `${title}\n\n${body}`;
}

/** Handles the markup that starts at html[index] and returns where the text resumes. */
function skipTag(html: string, lower: string, index: number, out: string[]): number {
  if (lower.startsWith('<!--', index)) {
    const end = lower.indexOf('-->', index + 4);
    return end === -1 ? html.length : end + 3;
  }
  const marker = html.charAt(index + 1);
  if (marker === '!' || marker === '?') {
    // <!doctype html>, <![CDATA[ ... ]]> openers and <?xml ... ?> carry no text.
    const end = html.indexOf('>', index + 2);
    return end === -1 ? html.length : end + 1;
  }
  const { name, closing } = tagNameAt(lower, index);
  if (name === '') {
    out.push('<');
    return index + 1;
  }
  const close = html.indexOf('>', index + 1);
  if (close === -1) return html.length;
  if (name === 'title' && !closing) {
    const end = lower.indexOf('</title', close);
    return end === -1 ? close + 1 : end;
  }
  if (!closing && HTML_SKIPPED_ELEMENTS.includes(name)) {
    const end = lower.indexOf(`</${name}`, close);
    if (end === -1) return html.length;
    const after = html.indexOf('>', end);
    return after === -1 ? html.length : after + 1;
  }
  if (HTML_BLOCK_ELEMENTS.includes(name) && !(closing && HTML_OPEN_ONLY_ELEMENTS.includes(name))) {
    out.push('\n');
  }
  return close + 1;
}
