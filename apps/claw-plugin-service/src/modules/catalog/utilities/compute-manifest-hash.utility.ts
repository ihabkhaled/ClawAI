import { createHash } from 'node:crypto';

function compareKeys(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

/** JSON with object keys sorted at every level, so equal manifests hash equally. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) => compareKeys(left, right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** sha256 hex of the canonical manifest JSON. */
export function computeManifestHash(manifest: unknown): string {
  return createHash('sha256').update(canonicalJson(manifest)).digest('hex');
}
