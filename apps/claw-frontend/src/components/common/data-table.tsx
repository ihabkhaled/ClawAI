'use client';

import { ResponsiveTable } from '@/components/common/responsive-table';
import type { DataTableColumn, DataTableProps, ResponsiveTableColumn } from '@/types';

export type { DataTableColumn };

// DataTable is the canonical listing primitive: at `md` and up it renders a
// real HTML table; below `md` each row collapses to a stacked card via
// ResponsiveTable so listing pages stay legible on mobile without the
// caller writing two layouts. The column promoted to the mobile-card
// title is selected by `mobileTitleKey` (defaults to the first column);
// that column's `renderMobileTitle` (when provided) or `render` produces
// the title, and the column is suppressed from the dl beneath the title
// so the primary identifier isn't repeated on small screens.
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage,
  mobileTitleKey,
  className,
}: DataTableProps<T>): React.ReactElement {
  const titleColumn =
    columns.find((col) => col.key === mobileTitleKey) ?? columns[0] ?? null;
  const bodyColumns: ResponsiveTableColumn<T>[] = titleColumn
    ? columns.filter((col) => col.key !== titleColumn.key)
    : columns;
  const renderMobileTitle = (row: T): React.ReactNode => {
    if (titleColumn === null) {
      return null;
    }
    const renderer = titleColumn.renderMobileTitle ?? titleColumn.render;
    return renderer(row);
  };

  return (
    <ResponsiveTable
      rows={data}
      columns={bodyColumns}
      keyExtractor={keyExtractor}
      mobileTitle={renderMobileTitle}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
}
