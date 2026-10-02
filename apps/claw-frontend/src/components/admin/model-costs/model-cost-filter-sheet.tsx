'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';

import { ModelCostFilterChips } from '@/components/admin/model-costs/model-cost-filter-chips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { ModelCostFilterSheetProps } from '@/types/model-cost.types';

/** On touch the chip groups move into a bottom sheet so the toolbar stays one row. */
export function ModelCostFilterSheet({
  activeFilterCount,
  ...chips
}: ModelCostFilterSheetProps): ReactElement {
  const { t } = chips;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="touch:inline-flex touch:min-h-11 hidden shrink-0 gap-2"
          data-testid="model-cost-filter-sheet-trigger"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t('adminModelCosts.filters.more')}
          {activeFilterCount > 0 ? (
            <Badge variant={BadgeVariant.SECONDARY}>{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{t('adminModelCosts.filters.sheetTitle')}</SheetTitle>
          <SheetDescription>{t('adminModelCosts.billing.help')}</SheetDescription>
        </SheetHeader>
        <ModelCostFilterChips {...chips} />
      </SheetContent>
    </Sheet>
  );
}
