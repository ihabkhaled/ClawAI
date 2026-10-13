import type { z } from 'zod';

import {
  JSON_BACKSLASH,
  JSON_CLOSE_BRACE,
  JSON_OPEN_BRACE,
  JSON_QUOTE,
  MODEL_JSON_MAX_OBJECT_STARTS,
  UTF8_BYTE_ORDER_MARK_CODE,
} from '../constants/generation.constants';
import { stripCodeFence } from './strip-code-fence.utility';

/** Index of the brace closing the object that opens at `start`, or -1 when it never closes. */
function findObjectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (inString) {
      if (escaped) escaped = false;
      else if (char === JSON_BACKSLASH) escaped = true;
      else if (char === JSON_QUOTE) inString = false;
    } else if (char === JSON_QUOTE) {
      inString = true;
    } else if (char === JSON_OPEN_BRACE) {
      depth += 1;
    } else if (char === JSON_CLOSE_BRACE) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function tryParse(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

/**
 * Every JSON value a model reply can reasonably be read as. A reply that is JSON (bare or in one
 * code fence) yields only itself; otherwise the balanced objects found inside surrounding prose
 * are yielded in order. A reply whose object never closes (cut off by the output limit) yields
 * nothing, so a truncated answer can never pass as a smaller valid one.
 */
function* jsonCandidates(content: string): Generator<unknown> {
  const unmarked = content.charCodeAt(0) === UTF8_BYTE_ORDER_MARK_CODE ? content.slice(1) : content;
  const text = unmarked.trim();
  const whole = tryParse(stripCodeFence(text));
  if (whole) {
    yield whole.value;
    return;
  }
  let from = 0;
  for (let starts = 0; starts < MODEL_JSON_MAX_OBJECT_STARTS; starts += 1) {
    const start = text.indexOf(JSON_OPEN_BRACE, from);
    if (start === -1) return;
    const end = findObjectEnd(text, start);
    if (end === -1) return;
    const parsed = tryParse(text.slice(start, end + 1));
    if (parsed) {
      yield parsed.value;
      from = end + 1;
    } else {
      from = start + 1;
    }
  }
}

/**
 * Reads structured output from a model reply that may carry a markdown fence or prose around the
 * JSON. With `accepts`, the first candidate the schema accepts wins, so an example object quoted
 * before the real answer is skipped; when none is accepted the first candidate is returned so the
 * caller's own validation reports the failure. Returns `undefined` when there is no JSON at all.
 */
export function parseModelJson(content: string, accepts?: z.ZodType): unknown {
  let first: unknown;
  for (const candidate of jsonCandidates(content)) {
    if (!accepts || accepts.safeParse(candidate).success) return candidate;
    first ??= candidate;
  }
  return first;
}
