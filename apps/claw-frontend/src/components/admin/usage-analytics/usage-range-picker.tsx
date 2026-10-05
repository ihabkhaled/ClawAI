import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { USAGE_PRESET_LABEL_KEYS } from '@/constants/usage-analytics.constants';
import type { UsageRangePickerProps } from '@/types/admin-usage-analytics.types';

/**
 * Period buttons shared by the per-user modal and the Observability page.
 * A toggle group: `aria-pressed` carries the selection, so it is not colour-only,
 * and the row wraps instead of scrolling on a narrow screen.
 */
export function UsageRangePicker({
  presets,
  value,
  onChange,
  t,
}: UsageRangePickerProps): ReactElement {
  return (
    <div role="group" aria-label={t('usageAnalytics.rangeLabel')} className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset}
          type="button"
          size="sm"
          variant={preset === value ? 'default' : 'outline'}
          aria-pressed={preset === value}
          onClick={() => {
            onChange(preset);
          }}
        >
          {t(USAGE_PRESET_LABEL_KEYS[preset])}
        </Button>
      ))}
    </div>
  );
}
