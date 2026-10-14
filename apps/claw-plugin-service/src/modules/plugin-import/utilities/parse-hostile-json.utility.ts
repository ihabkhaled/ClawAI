import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import {
  FORBIDDEN_JSON_KEYS,
  IMPORT_LIMITS,
  JSON_MAX_NODES,
} from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';

/** Strict UTF-8 text from bytes, or a refusal. A leading BOM is dropped. */
export function decodeUtf8Strict(bytes: Buffer, label: string): string {
  let decoded: string;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    decoded = text.codePointAt(0) === 0xfe_ff ? text.slice(1) : text;
  } catch {
    throw new PluginImportError(ImportErrorCode.NON_UTF8, `${label} is not valid UTF-8`);
  }
  // A NUL cannot be stored as text (PostgreSQL refuses it) and is never legitimate in a document.
  if (decoded.includes(String.fromCodePoint(0))) {
    throw new PluginImportError(ImportErrorCode.CONTENT_INVALID, `${label} contains a NUL byte`);
  }
  return decoded;
}

/** Deepest nesting of the text, counted without parsing it (strings and escapes are skipped). */
function measureDepth(text: string): number {
  let depth = 0;
  let deepest = 0;
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth += 1;
      deepest = Math.max(deepest, depth);
      if (deepest > IMPORT_LIMITS.maxJsonDepth) return deepest;
    } else if (char === '}' || char === ']') {
      depth -= 1;
    }
  }
  return deepest;
}

function assertSafeShape(value: unknown, state: { nodes: number }): void {
  state.nodes += 1;
  if (state.nodes > JSON_MAX_NODES) {
    throw new PluginImportError(ImportErrorCode.MANIFEST_TOO_LARGE, 'too many JSON values');
  }
  if (Array.isArray(value)) {
    for (const item of value) assertSafeShape(item, state);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        throw new PluginImportError(
          ImportErrorCode.MANIFEST_FORBIDDEN_KEY,
          `forbidden key ${JSON.stringify(key.slice(0, 40))}`,
        );
      }
      assertSafeShape(child, state);
    }
  }
}

/**
 * JSON from an untrusted file: size capped, strict UTF-8, nesting capped BEFORE parsing, and no
 * `__proto__` / `constructor` / `prototype` key anywhere (prototype pollution is refused, not stripped).
 */
export function parseHostileJson(bytes: Buffer, label: string): unknown {
  if (bytes.length > IMPORT_LIMITS.maxManifestBytes) {
    throw new PluginImportError(ImportErrorCode.MANIFEST_TOO_LARGE, `${label} is too large`);
  }
  const text = decodeUtf8Strict(bytes, label);
  if (measureDepth(text) > IMPORT_LIMITS.maxJsonDepth) {
    throw new PluginImportError(ImportErrorCode.MANIFEST_TOO_DEEP, `${label} is nested too deeply`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PluginImportError(ImportErrorCode.MANIFEST_INVALID, `${label} is not valid JSON`);
  }
  assertSafeShape(parsed, { nodes: 0 });
  return parsed;
}
