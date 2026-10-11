import type { ReactElement } from 'react';

import { CHART_PRIMARY_COLOR } from '@/constants/observability-explorer.constants';
import type { HorizontalBarChartProps } from '@/types/observability-explorer.types';
import { axisMax } from '@/utilities/chart.utility';
import { barPercent } from '@/utilities/usage-analytics.utility';

/**
 * Ranked horizontal bars as a list: label and value are real text (so they are
 * read in order and survive zoom), the bar is decoration. Bars grow from the
 * inline start, so they mirror correctly in right-to-left locales.
 */
export function HorizontalBarChart({
  data,
  ariaLabel,
  emptyLabel,
  formatValue,
}: HorizontalBarChartProps): ReactElement {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  const max = axisMax(data.map((datum) => datum.value));

  return (
    <ul aria-label={ariaLabel} className="space-y-2" data-testid="horizontal-bar-chart">
      {data.map((datum) => (
        <li key={datum.key} className="space-y-1" title={datum.hint}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{datum.label}</span>
            <span className="font-medium tabular-nums">{formatValue(datum.value)}</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
            <div
              className="h-full rounded-full"
              style={{
                width: `${barPercent(datum.value, max)}%`,
                backgroundColor: CHART_PRIMARY_COLOR,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
