'use client';

import { Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelExposureRowActionsProps } from '@/types/model-exposure.types';

/** Per-model Expose / Unexpose, so one model never needs the bulk bar. */
export function ModelExposureRowActions({
  view,
  isSaving,
  onExpose,
  onRequestUnexpose,
  t,
}: ModelExposureRowActionsProps): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="touch:h-11 touch:w-11 h-8 w-8 shrink-0"
          aria-label={t('adminConnectors.exposureUi.rowActions', { model: view.row.modelKey })}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={isSaving || view.isExposed}
          onSelect={() => onExpose(view.row)}
          className="touch:min-h-11 gap-2"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          {t('adminConnectors.exposureUi.exposeOne')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSaving || !view.isExposed}
          onSelect={() => onRequestUnexpose(view.row)}
          className="touch:min-h-11 text-destructive gap-2"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
          {t('adminConnectors.exposureUi.unexposeOne')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
