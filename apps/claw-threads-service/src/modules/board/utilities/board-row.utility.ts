import type { BoardCountRow, BoardItem, BoardRow } from '../types/board.types';
import type { PublicAuthor } from '../../author-identity/types/author-identity.types';

export function firstTotal(rows: BoardCountRow[]): number {
  return rows[0]?.total ?? 0;
}

/** Drops the publisher's id and replaces it with the name auth-service gave (or null). */
export function toItem(row: BoardRow, owners: ReadonlyMap<string, PublicAuthor>): BoardItem {
  const { ownerId, ...rest } = row;
  return {
    ...rest,
    owner: ownerId === null ? null : (owners.get(ownerId) ?? null),
    publishedAt: new Date(row.publishedAt).toISOString(),
  };
}
