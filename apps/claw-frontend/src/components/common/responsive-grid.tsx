import { RESPONSIVE_GRID_COLUMN_CLASSES } from '@/constants/responsive.constants';
import { ResponsiveGridColumns } from '@/enums';
import { cn } from '@/lib/utils';
import type { ResponsiveGridProps } from '@/types/component.types';

export function ResponsiveGrid({
  children,
  columns = ResponsiveGridColumns.CARDS,
  className,
}: ResponsiveGridProps): React.ReactElement {
  return (
    <div className={cn('grid gap-4', RESPONSIVE_GRID_COLUMN_CLASSES[columns], className)}>
      {children}
    </div>
  );
}
