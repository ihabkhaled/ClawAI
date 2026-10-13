import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { TOP_PREVIEW_CHOICES } from '@/constants/observability-pages.constants';
import type { TopSizePickerProps } from '@/types/observability-pages.types';

/** How many rows each hub preview shows. A user's choice, not a hardcoded cut. */
export function TopSizePicker({ value, onChange, t }: TopSizePickerProps): ReactElement {
  return (
    <div
      role="group"
      aria-label={t('observabilityPages.previewSize')}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-muted-foreground text-sm">{t('observabilityPages.previewSize')}</span>
      {TOP_PREVIEW_CHOICES.map((choice) => (
        <Button
          key={choice}
          type="button"
          size="sm"
          variant={choice === value ? 'default' : 'outline'}
          aria-pressed={choice === value}
          onClick={() => {
            onChange(choice);
          }}
        >
          {choice}
        </Button>
      ))}
    </div>
  );
}
