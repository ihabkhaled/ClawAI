import { JsonSchemaIssue } from '../../../common/enums/json-schema-issue.enum';
import {
  SCHEMA_ARRAY_KEYWORDS,
  SCHEMA_FORBIDDEN_KEYS,
  SCHEMA_FORBIDDEN_KEYWORDS,
  SCHEMA_MAP_KEYWORDS,
  SCHEMA_MAX_BYTES,
  SCHEMA_MAX_DEPTH,
  SCHEMA_MAX_NODES,
  SCHEMA_MAX_STRUCTURAL_DEPTH,
  SCHEMA_SINGLE_KEYWORDS,
} from '../constants/catalog.constants';
import { containsHostileText } from './contains-hostile-text.utility';
import { type WalkState } from '../types/json-schema.types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Guards raw JSON shape: structural depth, node count and forbidden keys. */
function walkStructure(value: unknown, depth: number, state: WalkState): void {
  state.nodes += 1;
  if (state.nodes > SCHEMA_MAX_NODES) {
    state.issues.add(JsonSchemaIssue.TOO_MANY_NODES);
    return;
  }
  if (depth > SCHEMA_MAX_STRUCTURAL_DEPTH) {
    state.issues.add(JsonSchemaIssue.TOO_DEEP);
    return;
  }
  if (typeof value === 'string') {
    if (containsHostileText(value, true)) state.issues.add(JsonSchemaIssue.HOSTILE_TEXT);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStructure(item, depth + 1, state);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (containsHostileText(key, false)) state.issues.add(JsonSchemaIssue.HOSTILE_TEXT);
    if (SCHEMA_FORBIDDEN_KEYS.includes(key)) state.issues.add(JsonSchemaIssue.FORBIDDEN_KEY);
    if (SCHEMA_FORBIDDEN_KEYWORDS.includes(key)) {
      state.issues.add(JsonSchemaIssue.FORBIDDEN_KEYWORD);
    }
    if (key === '$ref' && !(typeof child === 'string' && child.startsWith('#'))) {
      state.issues.add(JsonSchemaIssue.REMOTE_REF);
    }
    walkStructure(child, depth + 1, state);
  }
}

/** Collects the subschemas of one schema node. */
function childSchemas(node: Record<string, unknown>): unknown[] {
  const children: unknown[] = [];
  for (const [keyword, value] of Object.entries(node)) {
    if (SCHEMA_SINGLE_KEYWORDS.includes(keyword) && isPlainObject(value)) children.push(value);
    if (SCHEMA_ARRAY_KEYWORDS.includes(keyword) && Array.isArray(value)) children.push(...value);
    if (SCHEMA_MAP_KEYWORDS.includes(keyword) && isPlainObject(value)) {
      children.push(...Object.values(value));
    }
  }
  return children;
}

/** Deepest chain of nested subschemas; a schema with no children is depth 1. */
function subschemaDepth(node: unknown, level: number): number {
  if (!isPlainObject(node) || level > SCHEMA_MAX_DEPTH + 1) return level;
  let deepest = level;
  for (const child of childSchemas(node)) {
    deepest = Math.max(deepest, subschemaDepth(child, level + 1));
  }
  return deepest;
}

/**
 * Checks a tool input schema or settings schema against the safe subset the
 * plugin service accepts: a plain JSON object, at most 16 KB, no remote $ref,
 * no identity keywords, no prototype keys, no control or invisible characters in any key or string
 * value, bounded depth and node count.
 * Returns the problems found; an empty list means the schema is acceptable.
 */
export function checkJsonSchemaSubset(schema: unknown): JsonSchemaIssue[] {
  if (!isPlainObject(schema)) return [JsonSchemaIssue.NOT_AN_OBJECT];
  const state: WalkState = { nodes: 0, issues: new Set() };
  walkStructure(schema, 1, state);
  if (
    state.issues.has(JsonSchemaIssue.TOO_DEEP) ||
    state.issues.has(JsonSchemaIssue.TOO_MANY_NODES)
  ) {
    return [...state.issues];
  }
  let serialised: string | undefined;
  try {
    serialised = JSON.stringify(schema);
  } catch {
    state.issues.add(JsonSchemaIssue.NOT_SERIALISABLE);
  }
  if (serialised !== undefined && Buffer.byteLength(serialised, 'utf8') > SCHEMA_MAX_BYTES) {
    state.issues.add(JsonSchemaIssue.TOO_LARGE);
  }
  if (subschemaDepth(schema, 1) > SCHEMA_MAX_DEPTH) state.issues.add(JsonSchemaIssue.TOO_DEEP);
  return [...state.issues];
}
