import {
  PROSE_MAX_DEPTH,
  PROSE_MAX_NODES,
  PROSE_MIN_CHARS,
  PROSE_MIN_LETTER_SHARE,
  PROSE_MIN_SPACES,
  PROSE_SKIPPED_KEYS,
} from '../constants/embedded-content.constants';
import type { ProseHarvestState } from '../types/embedded-content.types';

/**
 * Walks parsed page data and keeps the strings that read like human text,
 * in document order, deduplicated, up to `maxChars`. Identifier-like keys
 * (`PROSE_SKIPPED_KEYS`) are never descended into, so ids, URLs and tokens
 * stay out. Bounded by node count and depth; cycles are skipped.
 */
export function harvestProse(roots: readonly unknown[], maxChars: number): string[] {
  const state: ProseHarvestState = {
    parts: [],
    seen: new Set(),
    visited: new WeakSet(),
    chars: 0,
    nodes: 0,
    maxChars,
  };
  for (const root of roots) {
    visit(root, state, 0);
  }
  return state.parts;
}

function visit(value: unknown, state: ProseHarvestState, depth: number): void {
  if (state.chars >= state.maxChars || state.nodes >= PROSE_MAX_NODES || depth > PROSE_MAX_DEPTH) {
    return;
  }
  state.nodes += 1;
  if (typeof value === 'string') {
    addProse(value, state);
    return;
  }
  if (typeof value !== 'object' || value === null || state.visited.has(value)) {
    return;
  }
  state.visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, state, depth + 1);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (!PROSE_SKIPPED_KEYS.has(key)) {
      visit(child, state, depth + 1);
    }
  }
}

function addProse(raw: string, state: ProseHarvestState): void {
  const text = toPlainText(raw);
  if (!isProse(text) || state.seen.has(text)) {
    return;
  }
  state.seen.add(text);
  const room = state.maxChars - state.chars;
  const kept = text.length > room ? text.slice(0, room) : text;
  state.parts.push(kept);
  state.chars += kept.length + 2;
}

/** Markup inside a data string (CMS bodies) becomes spaces; whitespace collapses. */
function toPlainText(raw: string): string {
  const withoutTags = /<[a-z/][^>]*>/iu.test(raw) ? raw.replaceAll(/<[^>]*>/gu, ' ') : raw;
  return withoutTags.replaceAll(/[ \t]+/gu, ' ').trim();
}

/**
 * Prose: long enough, not a URL or a serialized structure, mostly letters,
 * and word-separated (or written in a script that does not use spaces).
 */
export function isProse(text: string): boolean {
  if (text.length < PROSE_MIN_CHARS || /^(?:https?:\/\/|data:|[{[<])/iu.test(text)) {
    return false;
  }
  const compact = text.replaceAll(/\s+/gu, '');
  const letters = compact.match(/\p{L}/gu)?.length ?? 0;
  if (letters < compact.length * PROSE_MIN_LETTER_SHARE) {
    return false;
  }
  const spaces = text.length - text.replaceAll(' ', '').length;
  return (
    spaces >= PROSE_MIN_SPACES ||
    /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Thai}]/u.test(text)
  );
}
