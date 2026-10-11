import type { ReactElement } from 'react';

import {
  CHART_COLORS,
  DONUT_SIZE,
  DONUT_STROKE,
} from '@/constants/observability-explorer.constants';
import type { DonutChartProps } from '@/types/observability-explorer.types';
import { buildDonutArcs, chartColor } from '@/utilities/chart.utility';

/**
 * Share-of-total donut with a text legend carrying the value and percent of
 * every slice, so the numbers do not depend on reading the arcs.
 */
export function DonutChart({
  slices,
  ariaLabel,
  emptyLabel,
  formatValue,
}: DonutChartProps): ReactElement {
  const arcs = buildDonutArcs(slices);
  if (arcs.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-4" data-testid="donut-chart">
      <svg
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        role="img"
        aria-label={ariaLabel}
        className="h-36 w-36 shrink-0"
      >
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.path}
            fill="none"
            stroke={chartColor(CHART_COLORS, arc.colorIndex)}
            strokeWidth={DONUT_STROKE}
          >
            <title>{`${arc.label}: ${formatValue(arc.value)} (${arc.percent}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {arcs.map((arc) => (
          <li key={arc.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: chartColor(CHART_COLORS, arc.colorIndex) }}
            />
            <span className="min-w-0 truncate">{arc.label}</span>
            <span className="ms-auto font-medium tabular-nums">
              {formatValue(arc.value)} ({arc.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
