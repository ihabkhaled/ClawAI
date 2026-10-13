import type { ReactElement } from 'react';

import { SortableHead } from '@/components/observability/explorer/sortable-head';
import { EntityCell } from '@/components/observability/pages/entity-cell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { COMPACT_COLUMN_IDS, ENTITY_COLUMNS } from '@/constants/observability-pages.constants';
import { cn } from '@/lib/utils';
import type { EntityTableProps } from '@/types/observability-pages.types';

/**
 * One table for users, providers, models, plans and workflows. The columns come
 * from `ENTITY_COLUMNS`; only the ones the server can order by are sort buttons.
 * The first column stays put while the rest scroll sideways on a narrow screen.
 */
export function EntityTable({
  kind,
  rows,
  sort,
  order,
  onSort,
  compact = false,
  onOpenUser,
  sharedQuery,
  t,
}: EntityTableProps): ReactElement {
  const columns = compact
    ? ENTITY_COLUMNS[kind].filter((column) => COMPACT_COLUMN_IDS.includes(column.id))
    : ENTITY_COLUMNS[kind];
  return (
    <div className="overflow-x-auto" data-testid={`entity-table-${kind}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => {
              const sticky = index === 0 ? 'bg-background sticky start-0 z-10' : null;
              return column.sort === undefined || onSort === undefined ? (
                <TableHead
                  key={column.id}
                  className={cn(column.alignEnd === true ? 'text-end' : 'text-start', sticky)}
                >
                  {t(column.labelKey)}
                </TableHead>
              ) : (
                <SortableHead
                  key={column.id}
                  column={column.sort}
                  label={t(column.labelKey)}
                  sort={sort}
                  order={order}
                  onSort={onSort}
                  alignEnd={column.alignEnd === true}
                />
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {columns.map((column, index) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    column.alignEnd === true ? 'text-end tabular-nums' : 'min-w-0',
                    index === 0 ? 'bg-background sticky start-0 z-10 max-w-64' : null,
                  )}
                >
                  <EntityCell
                    column={column}
                    row={row}
                    onOpenUser={onOpenUser}
                    sharedQuery={sharedQuery}
                    t={t}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
