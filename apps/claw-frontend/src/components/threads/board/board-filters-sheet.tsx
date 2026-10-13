'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';

import { BoardFilters } from '@/components/threads/board/board-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { useTranslation } from '@/lib/i18n';
import type { BoardFiltersSheetProps } from '@/types/thread-board-view.types';

/** Phone-only bottom sheet; lazy-loaded by BoardToolbar. */
export function BoardFiltersSheet({
  lang,
  type,
  activeCount,
  onLanguageChange,
  onTypeChange,
  onClear,
}: BoardFiltersSheetProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 gap-2 md:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadBoardFilters')}
          {activeCount > 0 ? <Badge variant={BadgeVariant.SECONDARY}>{activeCount}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{t('chat.threadBoardFilters')}</SheetTitle>
        </SheetHeader>
        <BoardFilters
          idPrefix="board-sheet"
          lang={lang}
          type={type}
          onLanguageChange={onLanguageChange}
          onTypeChange={onTypeChange}
        />
        <SheetFooter className="gap-2">
          <Button type="button" variant="ghost" className="min-h-11" onClick={onClear}>
            {t('chat.threadBoardClearFilters')}
          </Button>
          <SheetClose asChild>
            <Button type="button" className="min-h-11">
              {t('chat.threadBoardApply')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
