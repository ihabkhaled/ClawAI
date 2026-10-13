import type { BoardCountRow, BoardItem, BoardRow } from '../types/board.types';

export function firstTotal(rows: BoardCountRow[]): number {
  return rows[0]?.total ?? 0;
}

export function toItem(row: BoardRow): BoardItem {
  return { ...row, publishedAt: new Date(row.publishedAt).toISOString() };
}
