// Elements of an XML part, found by ONE forward scan.
//
// The OOXML readers pull text out of parts a user supplied. A regex with a lazy
// body (`<p>([\s\S]*?)<\/p>`) looks harmless, but when openers never close, every
// opener rescans to the end of the part: a crafted 64 MB part of `<p>` is then
// quadratic and holds a CPU for minutes under a size cap that looked sufficient.
// Here the scan only moves forward, so the cost is linear in the part's size.

import { XML_NAME_BOUNDARY } from '../constants/xml-elements.constants';
import type { XmlElement } from '../types/xml-element.types';

/**
 * Every `<tag ...>inner</tag>` in document order.
 *
 * A self-closing `<tag/>` has no inner text and is skipped (it must not swallow
 * the elements after it). An opener with no closing tag ends the scan: nothing
 * after it can close either.
 */
export function elementsOf(xml: string, tag: string): XmlElement[] {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const found: XmlElement[] = [];
  let position = 0;
  while (position < xml.length) {
    const start = xml.indexOf(open, position);
    if (start === -1) {
      return found;
    }
    const nameEnd = start + open.length;
    const next = xml.charAt(nameEnd);
    if (next === '' || !XML_NAME_BOUNDARY.includes(next)) {
      position = nameEnd;
      continue;
    }
    const tagEnd = xml.indexOf('>', nameEnd);
    if (tagEnd === -1) {
      return found;
    }
    if (xml.charAt(tagEnd - 1) === '/') {
      position = tagEnd + 1;
      continue;
    }
    const end = xml.indexOf(close, tagEnd + 1);
    if (end === -1) {
      return found;
    }
    found.push({ attributes: xml.slice(nameEnd, tagEnd), inner: xml.slice(tagEnd + 1, end) });
    position = end + close.length;
  }
  return found;
}
