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
          'text-muted-foreground flex h-24 items-center justify-center rounded-md border text-sm',
          className,
        )}
      >
        {emptyMessage ?? t('common.noDataAvailable')}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={keyExtractor(row)}
            className="bg-surface-panel shadow-soft min-w-0 overflow-hidden rounded-lg border p-4"
          >
            <div className="text-foreground mb-2 text-sm font-medium">{mobileTitle(row)}</div>
            <dl className="space-y-2">
              {columns.map((col) =>
                col.header ? (
                  <div
                    key={col.key}
                    className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-3 text-sm"
                  >
                    <dt className="text-muted-foreground shrink-0">{col.header}</dt>
                    <dd className="text-foreground min-w-0 text-end break-words">
                      {col.render(row)}
                    </dd>
                  </div>
                ) : (
                  <div key={col.key} className="flex min-h-11 items-center justify-end">
                    {col.render(row)}
                  </div>
                ),
              )}
            </dl>
          </li>
        ))}
      </ul>

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
