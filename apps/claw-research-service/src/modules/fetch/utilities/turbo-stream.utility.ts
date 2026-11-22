import { PROSE_MAX_NODES, REACT_ROUTER_ENQUEUE_RE } from '../constants/embedded-content.constants';
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
  for (const match of html.matchAll(REACT_ROUTER_ENQUEUE_RE)) {
    const literal = parseJsonSafely(match[1] ?? '');
    if (typeof literal === 'string') {
      chunks.push(literal);
    }
  }
  const firstLine = chunks.join('').split('\n')[0] ?? '';
  const values = parseJsonSafely(firstLine);
  return Array.isArray(values) && values.length > 0
    ? new TurboStreamHydrator(values).hydrate(0)
    : null;
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
