'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';

import { ModelExposureFilterSelect } from '@/components/admin/connectors/model-exposure-filter-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { ModelExposureFilterSheetProps } from '@/types/model-exposure.types';

/** On touch, the exposure filter and the selection helpers live in a bottom sheet. */
export function ModelExposureFilterSheet({
  exposedOnly,
  hasActiveFilters,
  onExposureFilterChange,
  onSelectAllVisible,
  onClearSelection,
  t,
}: ModelExposureFilterSheetProps): ReactElement {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="touch:inline-flex touch:min-h-11 hidden shrink-0 gap-2"
          data-testid="model-exposure-filter-sheet-trigger"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t('adminConnectors.exposureUi.filtersButton')}
          {hasActiveFilters ? <Badge variant={BadgeVariant.SECONDARY}>1</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{t('adminConnectors.exposureUi.filtersTitle')}</SheetTitle>
          <SheetDescription>{t('adminConnectors.exposure.description')}</SheetDescription>
        </SheetHeader>
        <ModelExposureFilterSelect
          exposedOnly={exposedOnly}
          onChange={onExposureFilterChange}
          triggerClassName="w-full"
          t={t}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SheetClose asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={onSelectAllVisible}
            >
              {t('adminConnectors.exposure.selectAllVisible')}
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="button" variant="ghost" className="min-h-11" onClick={onClearSelection}>
              {t('adminConnectors.exposure.clearSelection')}
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
