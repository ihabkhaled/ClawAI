const MAX_PAYLOAD_PREVIEW_CHARS = 2000;

/**
 * Produces a compact, pretty-printed JSON preview of a workspace
 * action's payload. Returns null when the payload is empty so the UI
 * can hide the disclosure row entirely.
 */
export function formatPayloadPreview(payload: Record<string, unknown>): string | null {
  if (payload === null || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return null;
  }
  const redacted = redactSensitive(payload);
  const pretty = JSON.stringify(redacted, null, 2);
  if (pretty.length <= MAX_PAYLOAD_PREVIEW_CHARS) {
    return pretty;
  }
  return `${pretty.slice(0, MAX_PAYLOAD_PREVIEW_CHARS)}\n\n… truncated (${String(pretty.length - MAX_PAYLOAD_PREVIEW_CHARS)} more chars)`;
}

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /api[_-]?key/i,
  /bearer/i,
  /authori[sz]ation/i,
];

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(k));
      out[k] = isSensitive ? '[REDACTED]' : redactSensitive(v);
    }
    return out;
  }
  return value;
}
