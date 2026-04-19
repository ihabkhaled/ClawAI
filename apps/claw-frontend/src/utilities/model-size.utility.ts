export function formatModelSize(sizeBytes: string | number | null): string {
  if (sizeBytes === null || sizeBytes === '0') {
    return '—';
  }
  const n = typeof sizeBytes === 'string' ? Number(sizeBytes) : sizeBytes;
  if (!Number.isFinite(n) || n <= 0) {
    return '—';
  }
  const gib = n / 1024 ** 3;
  if (gib >= 1) {
    return `${gib.toFixed(1)} GB`;
  }
  const mib = n / 1024 ** 2;
  return `${mib.toFixed(0)} MB`;
}
