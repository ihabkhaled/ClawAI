import {
  FORBIDDEN_JSON_KEYS,
  FRONT_MATTER_LINE,
  FRONT_MATTER_PATTERN,
  LINE_BREAK,
} from '../constants/plugin-import.constants';
import { type FrontMatter } from '../types/plugin-import.types';

function unquote(value: string): string {
  const quoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));
  return quoted ? value.slice(1, -1) : value;
}

/**
 * The flat `key: value` lines of a SKILL.md / command / agent header. Deliberately not YAML: nested
 * values, anchors and tags are not interpreted, only top-level scalars are read, quotes are removed.
 * The result has no prototype, so a `__proto__:` line is dropped and cannot pollute anything.
 */
export function parseFrontMatter(text: string): FrontMatter {
  const match = FRONT_MATTER_PATTERN.exec(text);
  const data = new Map<string, string>();
  if (match === null) return { data: Object.fromEntries(data), body: text };
  for (const line of (match[1] ?? '').split(LINE_BREAK)) {
    const pair = FRONT_MATTER_LINE.exec(line);
    const key = pair?.[1];
    if (key === undefined || FORBIDDEN_JSON_KEYS.has(key)) continue;
    data.set(key, unquote((pair?.[2] ?? '').trim()));
  }
  return { data: Object.fromEntries(data), body: text.slice(match[0].length) };
}
