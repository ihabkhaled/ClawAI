import {
  EMBEDDED_HTML_SCAN_MAX_CHARS,
  PROSE_MAX_NODES,
  REACT_ROUTER_ENQUEUE_CALL,
} from '../constants/embedded-content.constants';
import { parseJsonSafely } from './script-blocks.utility';

/**
 * Decodes the loader data a React Router (v7) / Remix page streams into its
 * HTML as `__reactRouterContext.streamController.enqueue("…")` (turbo-stream).
 *
 * The first line of the stream is a flat JSON array. An object is encoded as
 * `{"_<keyIndex>": <valueIndex>}`, an array as a list of indexes, a primitive
 * as itself; negative indexes are null/undefined/NaN sentinels and a string
 * type tag (`["D", …]`, `["P", …]`) marks a Date/Promise/… that has no
 * readable text, so both become null. Later lines (resolved promises) are
 * ignored. Returns the hydrated root, or null when the page has no stream.
 */
export function decodeReactRouterStream(html: string): unknown {
  const chunks: string[] = [];
  const source =
    html.length > EMBEDDED_HTML_SCAN_MAX_CHARS ? html.slice(0, EMBEDDED_HTML_SCAN_MAX_CHARS) : html;
  let cursor = 0;
  for (;;) {
    const call = source.indexOf(REACT_ROUTER_ENQUEUE_CALL, cursor);
    if (call === -1) break;
    const start = call + REACT_ROUTER_ENQUEUE_CALL.length;
    const end = readStringLiteralEnd(source, start);
    if (end === -1) break;
    const literal = parseJsonSafely(source.slice(start, end));
    if (typeof literal === 'string') {
      chunks.push(literal);
    }
    cursor = end;
  }
  const firstLine = chunks.join('').split('\n')[0] ?? '';
  const values = parseJsonSafely(firstLine);
  return Array.isArray(values) && values.length > 0
    ? new TurboStreamHydrator(values).hydrate(0)
    : null;
}

/** End index (exclusive) of the double-quoted JS string literal starting at `start`, or -1. Linear. */
function readStringLiteralEnd(text: string, start: number): number {
  if (text.charAt(start) !== '"') return -1;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === '\\') {
      index += 1;
    } else if (char === '"') {
      return index + 1;
    }
  }
  return -1;
}

class TurboStreamHydrator {
  private readonly memo = new Map<number, unknown>();
  private nodes = 0;

  constructor(private readonly values: readonly unknown[]) {}

  hydrate(index: number): unknown {
    if (index < 0 || index >= this.values.length || this.nodes >= PROSE_MAX_NODES) {
      return null;
    }
    if (this.memo.has(index)) {
      return this.memo.get(index);
    }
    this.nodes += 1;
    const value = this.values.at(index);
    if (Array.isArray(value)) {
      return this.hydrateArray(index, value);
    }
    if (typeof value === 'object' && value !== null) {
      return this.hydrateObject(index, value);
    }
    return value;
  }

  private hydrateArray(index: number, encoded: readonly unknown[]): unknown {
    if (typeof encoded[0] === 'string') {
      return null;
    }
    const out: unknown[] = [];
    this.memo.set(index, out);
    for (const item of encoded) {
      out.push(typeof item === 'number' ? this.hydrate(item) : null);
    }
    return out;
  }

  /** Keys are page data: defined as own properties, so `__proto__` can never reach a prototype. */
  private hydrateObject(index: number, encoded: object): unknown {
    const record: Record<string, unknown> = {};
    this.memo.set(index, record);
    for (const [encodedKey, valueIndex] of Object.entries(encoded)) {
      const key = this.values.at(Number(encodedKey.slice(1)));
      if (typeof key === 'string' && typeof valueIndex === 'number') {
        Object.defineProperty(record, key, {
          value: this.hydrate(valueIndex),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
    return record;
  }
}
