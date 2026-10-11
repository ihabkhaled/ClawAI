import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortableHeadProps } from '@/types/observability-explorer.types';
import { ariaSortValue } from '@/utilities/observability-explorer.utility';

/** A column header that is a real button, announces its sort state, and flips on activation. */
export function SortableHead({
  column,
  label,
  sort,
  order,
  onSort,
  alignEnd = false,
}: SortableHeadProps): ReactElement {
  const alignment = alignEnd ? 'text-end' : 'text-start';
  if (onSort === undefined) {
    return <TableHead className={alignment}>{label}</TableHead>;
  }
  const active = column === sort;
  return (
    <TableHead aria-sort={ariaSortValue(column, sort, order)} className={alignment}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'hover:text-foreground -mx-2 h-auto gap-1 px-2 py-1 font-medium hover:bg-transparent',
          active ? 'text-foreground' : null,
        )}
        onClick={() => {
          onSort(column);
        }}
      >
        {label}
        {active && order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {active && order === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        ) : null}
      </Button>
    </TableHead>
  );
}
