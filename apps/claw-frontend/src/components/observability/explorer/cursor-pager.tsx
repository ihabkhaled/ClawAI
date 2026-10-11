import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { CursorPagerProps } from '@/types/observability-explorer.types';

/** Previous / next for keyset-paged lists, which know their next page but not their total. */
export function CursorPager({ pager, nextCursor, isFetching, t }: CursorPagerProps): ReactElement {
  return (
    <nav
      aria-label={t('pagination.label')}
      className="mt-3 flex items-center justify-between gap-2"
      data-testid="cursor-pager"
    >
      <span className="text-muted-foreground text-sm">
        {t('observabilityExplorer.pageNumber', { page: pager.pageNumber })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('pagination.previous')}
          disabled={!pager.hasPrevious || isFetching}
          onClick={pager.goPrevious}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('pagination.next')}
          disabled={nextCursor === null || isFetching}
          onClick={() => {
            pager.goNext(nextCursor);
          }}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
