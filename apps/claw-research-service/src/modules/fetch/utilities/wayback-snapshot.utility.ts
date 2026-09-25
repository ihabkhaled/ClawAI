/**
 * `http://web.archive.org/web/20200101000000/https://x/` →
 * `https://web.archive.org/web/20200101000000id_/https://x/` — the raw
 * archived bytes, without the Wayback toolbar, over HTTPS.
 */
export function toRawSnapshotUrl(snapshotUrl: string, timestamp: string): string {
  const secure = snapshotUrl.replace(/^http:\/\//u, 'https://');
  return secure.replace(`/web/${timestamp}/`, `/web/${timestamp}id_/`);
}

/** `20200101123045` → `2020-01-01T12:30:45.000Z`; unparseable input stays as-is. */
export function waybackTimestampToIso(timestamp: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/u.exec(timestamp);
  if (match === null) {
    return timestamp;
  }
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  return `${year ?? ''}-${month ?? ''}-${day ?? ''}T${hour}:${minute}:${second}.000Z`;
}
