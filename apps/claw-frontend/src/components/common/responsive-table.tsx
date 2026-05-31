'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ResponsiveTableProps } from '@/types/component.types';

// Mobile-first responsive table. Below the `md` breakpoint each row collapses
// into a vertical stacked card with a per-row title and field/value pairs;
// at `md` and up the regular HTML table layout takes over. The two views
// share the same `columns` definition so consumers never duplicate render
// logic between desktop and mobile.
export function ResponsiveTable<T>({
  rows,
  columns,
  keyExtractor,
  mobileTitle,
  emptyMessage,
  className,
}: ResponsiveTableProps<T>): React.ReactElement {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground',
          className,
        )}
      >
        {emptyMessage ?? t('common.noDataAvailable')}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile (< md): stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={keyExtractor(row)}
            className="rounded-lg border bg-surface-panel p-4 shadow-soft"
          >
            <div className="mb-2 text-sm font-medium text-foreground">
              {mobileTitle(row)}
            </div>
            <dl className="space-y-1.5">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <dt className="shrink-0 text-muted-foreground">{col.header}</dt>
                  <dd className="min-w-0 text-end text-foreground">
                    {col.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop (md+): table */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={keyExtractor(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
