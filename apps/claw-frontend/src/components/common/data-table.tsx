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
import type { DataTableColumn, DataTableProps } from '@/types';

export type { DataTableColumn };

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage }: DataTableProps<T>) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
        {emptyMessage ?? t('common.noDataAvailable')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
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
          {data.map((row) => (
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
  );
}
