import type { SitemapCursor } from '../types/chat-share-discovery.types';

export function encodeSitemapCursor(cursor: SitemapCursor): string {
  return Buffer.from(`${cursor.updatedAt.toISOString()}\n${cursor.id}`).toString('base64url');
}

export function decodeSitemapCursor(value: string): SitemapCursor | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const [updatedAtValue, id, extra] = decoded.split('\n');
    const updatedAt = new Date(updatedAtValue ?? '');
    if (
      extra !== undefined ||
      id === undefined ||
      !/^[A-Za-z0-9-]{1,64}$/u.test(id) ||
      Number.isNaN(updatedAt.getTime())
    ) {
      return null;
    }
    return { updatedAt, id };
  } catch {
    return null;
  }
}
