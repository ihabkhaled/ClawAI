import type { ReactElement } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { BOARD_SKELETON_COUNT } from '@/constants/thread-board-view.constants';

export function BoardSkeleton(): ReactElement {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      data-testid="board-skeleton"
    >
      {Array.from({ length: BOARD_SKELETON_COUNT }, (_, index) => (
        <div
          key={index}
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
