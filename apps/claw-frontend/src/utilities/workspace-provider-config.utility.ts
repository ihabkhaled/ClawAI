export function normalizeStringRecord(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object') {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const out: Record<string, string> = {};
  for (const [key, v] of entries) {
    if (typeof v === 'string') {
      out[key] = v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[key] = String(v);
    }
  }
  return out;
}
