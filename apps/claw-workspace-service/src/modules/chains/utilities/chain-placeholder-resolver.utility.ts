import type { ChainStepOutputs } from '../types/chain.types';

// v3 round 12 (2026-05-14) — Prompt 11: chain placeholder resolver.
//
// Walks a step payload and substitutes {{steps.<stepId>.output.<path>}}
// tokens with values from EARLIER steps' outputs. This is what lets a
// "post Slack message" step reference the Jira key created two steps
// back.
//
// Grammar (deliberately tiny — NOT a general expression language, NO
// eval / vm / Function):
//   {{steps.<stepId>.output}}              → the whole output object
//   {{steps.<stepId>.output.<key>}}        → a nested field
//   {{steps.<stepId>.output.<a>.<b>}}      → deeper nesting
//
// Resolution rules:
//   - A whole-string token ("{{...}}") resolves to the raw value
//     (preserves type — number stays number, object stays object).
//   - An embedded token ("PR #{{...}}") resolves to its string form.
//   - An unknown stepId or missing path → the literal token is left
//     in place AND collected into `unresolved` so the executor can
//     decide whether to fail the step.
//   - `__proto__` / `constructor` / `prototype` path segments are
//     rejected (prototype-pollution guard) — treated as unresolved.

const TOKEN_REGEX = /\{\{\s*steps\.([a-zA-Z0-9_-]+)\.output((?:\.[a-zA-Z0-9_-]+)*)\s*\}\}/g;
const BANNED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export type ResolveResult = {
  payload: Record<string, unknown>;
  unresolved: string[];
};

export function resolveChainPayload(
  payload: Record<string, unknown>,
  outputs: ChainStepOutputs,
): ResolveResult {
  const unresolved: string[] = [];
  const resolved = walk(payload, outputs, unresolved) as Record<string, unknown>;
  return { payload: resolved, unresolved };
}

function walk(value: unknown, outputs: ChainStepOutputs, unresolved: string[]): unknown {
  if (typeof value === 'string') {
    return resolveString(value, outputs, unresolved);
  }
  if (Array.isArray(value)) {
    return value.map((v) => walk(v, outputs, unresolved));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, outputs, unresolved);
    }
    return out;
  }
  return value;
}

function resolveString(
  raw: string,
  outputs: ChainStepOutputs,
  unresolved: string[],
): unknown {
  // Whole-string token → return the raw value (type-preserving).
  const wholeMatch = /^\{\{\s*steps\.([a-zA-Z0-9_-]+)\.output((?:\.[a-zA-Z0-9_-]+)*)\s*\}\}$/.exec(
    raw,
  );
  if (wholeMatch !== null) {
    const stepId = wholeMatch[1] ?? '';
    const pathStr = wholeMatch[2] ?? '';
    const value = lookup(stepId, pathStr, outputs);
    if (value === undefined) {
      unresolved.push(raw);
      return raw;
    }
    return value;
  }

  // Embedded token(s) → stringify each match in place.
  return raw.replace(TOKEN_REGEX, (token, stepId: string, pathStr: string) => {
    const value = lookup(stepId, pathStr, outputs);
    if (value === undefined) {
      unresolved.push(token);
      return token;
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function lookup(
  stepId: string,
  pathStr: string,
  outputs: ChainStepOutputs,
): unknown {
  const stepOutput = outputs[stepId];
  if (stepOutput === undefined) return undefined;
  if (pathStr === '') return stepOutput;
  // pathStr looks like ".a.b.c" — split, drop the empty leading segment.
  const segments = pathStr.split('.').filter((s) => s.length > 0);
  let cursor: unknown = stepOutput;
  for (const segment of segments) {
    if (BANNED_SEGMENTS.has(segment)) return undefined;
    if (cursor === null || typeof cursor !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cursor, segment)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}
