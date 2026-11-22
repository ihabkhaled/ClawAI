import {
  EMBEDDED_STATE_MAX_CHARS,
  EMBEDDED_STATE_MIN_CHARS,
  JSON_SCRIPT_TYPE_RE,
  LD_JSON_TYPE_RE,
  NEXT_DATA_ID_RE,
  NUXT_DATA_ID_RE,
  WINDOW_STATE_NAMES,
} from '../constants/embedded-content.constants';
import { EmbeddedStateSource } from '../enums/embedded-state-source.enum';
import { harvestProse } from './prose-harvest.utility';
import { listScriptBlocks, parseJsonSafely, readAssignedJson } from './script-blocks.utility';
import { decodeReactRouterStream } from './turbo-stream.utility';
import type {
  EmbeddedStateText,
  EmbeddedStateValue,
  ScriptBlock,
} from '../types/embedded-content.types';

/**
 * Generic fallback for a page whose visible text is thin: reads the data the
 * page ships for its own scripts — JSON-LD, `__NEXT_DATA__`, `__NUXT_DATA__`,
 * other JSON script blocks, `window.__INITIAL_STATE__`-style assignments
 * (`WINDOW_STATE_NAMES`) and a React Router turbo-stream — and keeps the
 * strings that read like prose. Only the HTML already fetched is read; no
 * request is made and no script is executed. Null when nothing useful is
 * there (`EMBEDDED_STATE_MIN_CHARS`).
 */
export function extractEmbeddedStateText(html: string): EmbeddedStateText | null {
  const found = collectEmbeddedState(html);
  if (found.length === 0) {
    return null;
  }
  const text = harvestProse(
    found.map((entry) => entry.value),
    EMBEDDED_STATE_MAX_CHARS,
  ).join('\n\n');
  return text.length < EMBEDDED_STATE_MIN_CHARS
    ? null
    : { text, sources: [...new Set(found.map((entry) => entry.source))] };
}

/** Every parsed embedded-state value of a page, JSON-LD first. */
export function collectEmbeddedState(html: string): EmbeddedStateValue[] {
  const found: EmbeddedStateValue[] = [];
  for (const block of listScriptBlocks(html)) {
    found.push(...stateOfBlock(block));
  }
  const stream = decodeReactRouterStream(html);
  if (stream !== null) {
    found.push({ source: EmbeddedStateSource.REACT_ROUTER_STREAM, value: stream });
  }
  return found.sort((a, b) => rank(a.source) - rank(b.source));
}

function stateOfBlock(block: ScriptBlock): EmbeddedStateValue[] {
  if (JSON_SCRIPT_TYPE_RE.test(block.attributes)) {
    const value = parseJsonSafely(block.body.trim());
    return value === undefined ? [] : [{ source: jsonBlockSource(block.attributes), value }];
  }
  const values: EmbeddedStateValue[] = [];
  for (const name of WINDOW_STATE_NAMES) {
    const at = block.body.indexOf(name);
    if (at === -1) {
      continue;
    }
    const value = readAssignedJson(block.body, at + name.length);
    if (value !== undefined) {
      values.push({ source: EmbeddedStateSource.WINDOW_STATE, value });
    }
  }
  return values;
}

function jsonBlockSource(attributes: string): EmbeddedStateSource {
  if (LD_JSON_TYPE_RE.test(attributes)) {
    return EmbeddedStateSource.JSON_LD;
  }
  if (NEXT_DATA_ID_RE.test(attributes)) {
    return EmbeddedStateSource.NEXT_DATA;
  }
  return NUXT_DATA_ID_RE.test(attributes)
    ? EmbeddedStateSource.NUXT_DATA
    : EmbeddedStateSource.JSON_SCRIPT;
}

/** JSON-LD is written for readers (articleBody, description); app config blocks last. */
function rank(source: EmbeddedStateSource): number {
  switch (source) {
    case EmbeddedStateSource.JSON_LD: {
      return 0;
    }
    case EmbeddedStateSource.JSON_SCRIPT: {
      return 2;
    }
    default: {
      return 1;
    }
  }
}
