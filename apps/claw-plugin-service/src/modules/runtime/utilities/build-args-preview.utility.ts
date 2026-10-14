import { createHash } from 'node:crypto';

import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { canonicalJson } from '../../catalog/utilities/compute-manifest-hash.utility';
import {
  ARGS_PREVIEW_MAX,
  ARGS_PREVIEW_MAX_DEPTH,
  ARGS_PREVIEW_STRING_MAX,
  LONG_TOKEN_PATTERN,
  REDACTED,
  SENSITIVE_KEY_PATTERN,
} from '../constants/runtime.constants';

/** sha256 of the canonical JSON of the arguments: the audit row's only trace of what was sent. */
export function hashArguments(args: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJson(args)).digest('hex');
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (depth > ARGS_PREVIEW_MAX_DEPTH) return '…';
  if (typeof value === 'string') {
    const scrubbed = value.replaceAll(LONG_TOKEN_PATTERN, REDACTED);
    return scrubbed.length > ARGS_PREVIEW_STRING_MAX
      ? `${scrubbed.slice(0, ARGS_PREVIEW_STRING_MAX)}…`
      : scrubbed;
  }
  if (Array.isArray(value))
    return value.slice(0, 10).map((item) => redactValue('', item, depth + 1));
  return isPlainRecord(value)
    ? Object.fromEntries(
        Object.entries(value).map(([name, child]) => [name, redactValue(name, child, depth + 1)]),
      )
    : value;
}

/**
 * A short, scrubbed view of the arguments for the consent question the user is asked: values under
 * secret-looking keys and long token-like strings are replaced, long strings and lists are cut,
 * and the whole thing is capped at 512 characters. It is shown to the user, never stored.
 */
export function buildArgsPreview(args: Record<string, unknown>): string {
  const text = JSON.stringify(redactValue('', args, 0)) ?? '{}';
  return text.length > ARGS_PREVIEW_MAX ? `${text.slice(0, ARGS_PREVIEW_MAX)}…` : text;
}
