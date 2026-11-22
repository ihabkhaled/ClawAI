import {
  EMBEDDED_HTML_SCAN_MAX_CHARS,
  EMBEDDED_MAX_SCRIPT_BLOCKS,
  EMBEDDED_SCRIPT_MAX_CHARS,
  SCRIPT_CLOSE_TAG,
  SCRIPT_OPEN_TAG,
} from '../constants/embedded-content.constants';
import type { ScriptBlock } from '../types/embedded-content.types';

/**
 * Every `<script>` element of a page, in document order. One linear pass with indexOf over a
 * lower-cased copy (tags are case-insensitive), capped in input size and block count, so a hostile
 * page cannot make the scan super-linear. An opener with no closer ends the scan.
 */
export function listScriptBlocks(html: string): ScriptBlock[] {
  const source =
    html.length > EMBEDDED_HTML_SCAN_MAX_CHARS ? html.slice(0, EMBEDDED_HTML_SCAN_MAX_CHARS) : html;
  const lower = source.toLowerCase();
  const blocks: ScriptBlock[] = [];
  let cursor = 0;
  while (blocks.length < EMBEDDED_MAX_SCRIPT_BLOCKS) {
    const open = lower.indexOf(SCRIPT_OPEN_TAG, cursor);
    if (open === -1) break;
    const afterName = open + SCRIPT_OPEN_TAG.length;
    const next = lower.charAt(afterName);
    if (next !== '>' && next.trim() !== '') {
      cursor = afterName; // `<scripts`, `<script-x`: not a script tag
      continue;
    }
    const tagEnd = lower.indexOf('>', afterName);
    if (tagEnd === -1) break;
    const close = lower.indexOf(SCRIPT_CLOSE_TAG, tagEnd + 1);
    if (close === -1) break;
    const body = source.slice(tagEnd + 1, close);
    if (body.length > 0 && body.length <= EMBEDDED_SCRIPT_MAX_CHARS) {
      blocks.push({ attributes: source.slice(afterName, tagEnd), body });
    }
    cursor = close + SCRIPT_CLOSE_TAG.length;
  }
  return blocks;
}

/** `JSON.parse`, or `undefined` for anything that is not strict JSON. */
export function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Reads the JSON value assigned right after `from` in a script body —
 * `name = {…}` / `name = […]`. Only whitespace and `=` may sit between, the
 * object/array is cut at its balanced end (strings and escapes respected)
 * and must then parse as strict JSON. A JS object literal that is not JSON
 * yields `undefined`, never an evaluation.
 */
export function readAssignedJson(source: string, from: number): unknown {
  let index = from;
  while (index < source.length && /[\s=]/u.test(source.charAt(index))) {
    index += 1;
  }
  const open = source.charAt(index);
  if (open !== '{' && open !== '[') {
    return undefined;
  }
  const end = balancedEnd(source, index);
  return end === -1 ? undefined : parseJsonSafely(source.slice(index, end + 1));
}

/** Index of the bracket closing the one at `start`, or -1. */
function balancedEnd(source: string, start: number): number {
  let depth = 0;
  let inString = false;
  const limit = Math.min(source.length, start + EMBEDDED_SCRIPT_MAX_CHARS);
  for (let index = start; index < limit; index += 1) {
    const char = source.charAt(index);
    if (inString) {
      if (char === '\\') {
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

/** A plain object as a record, or null. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A trimmed non-empty string, or null. */
export function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * First object in a JSON graph for which `predicate` holds, breadth-first,
 * bounded by `maxNodes` (cycles are skipped).
 */
export function findObject(
  root: unknown,
  predicate: (value: Record<string, unknown>) => boolean,
  maxNodes: number,
): Record<string, unknown> | null {
  const queue: unknown[] = [root];
  const seen = new WeakSet<object>();
  for (let index = 0; index < queue.length && index < maxNodes; index += 1) {
    const value = queue.at(index);
    if (typeof value !== 'object' || value === null || seen.has(value)) {
      continue;
    }
    seen.add(value);
    const record = asRecord(value);
    if (record !== null && predicate(record)) {
      return record;
    }
    queue.push(...(Array.isArray(value) ? value : Object.values(value)));
  }
  return null;
}
