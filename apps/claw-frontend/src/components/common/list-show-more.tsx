'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { ListShowMoreProps } from '@/types/pagination.types';

/** "Showing 50 of 449" plus a Show more button, for a client-side list. */
export function ListShowMore({
  shownCount,
  totalCount,
  hasMore,
  onShowMore,
  showMoreLabel,
  shownLabel,
}: ListShowMoreProps): ReactElement | null {
  if (totalCount === 0) {
    return null;
  }
  return (
    <div className="flex flex-col items-center gap-2 py-2" data-testid="list-show-more">
      <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
        {shownLabel}
      </p>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onShowMore}
          className="touch:min-h-11 w-full sm:w-auto"
          data-shown={shownCount}
        >
          {showMoreLabel}
        </Button>
      ) : null}
    </div>
  );
}
