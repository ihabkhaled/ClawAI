import type { ReactElement } from 'react';

import {
  CHART_COLORS,
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
} from '@/constants/observability-explorer.constants';
import type { StackedBarChartProps } from '@/types/observability-explorer.types';
import { axisMax, chartColor, pickLabelIndexes } from '@/utilities/chart.utility';

/**
 * Stacked columns, one per bucket, in plain SVG. Every column is focusable and
 * carries a label listing each series value, and a legend names the colours (so
 * colour is never the only carrier of meaning).
 */
export function StackedBarChart({
  labels,
  series,
  ariaLabel,
  emptyLabel,
  formatValue,
}: StackedBarChartProps): ReactElement {
  if (labels.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  const totals = labels.map((_, index) =>
    series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0),
  );
  const max = axisMax(totals);
  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const baseline = CHART_HEIGHT - CHART_PADDING;
  const slot = innerWidth / labels.length;
  const barWidth = Math.max(2, slot * 0.7);

  return (
    <div dir="ltr" className="w-full space-y-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
        data-testid="stacked-bar-chart"
      >
        <line
          x1={CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y1={baseline}
          y2={baseline}
          stroke="hsl(var(--border))"
        />
        <text x={CHART_PADDING} y={CHART_PADDING - 8} fontSize="11" fill="currentColor">
          {formatValue(max)}
        </text>
        {labels.map((label, index) => {
          let top = baseline;
          const x = CHART_PADDING + slot * index + (slot - barWidth) / 2;
          const summary = series
            .map((item) => `${item.label} ${formatValue(item.values[index] ?? 0)}`)
            .join(', ');
          return (
            <g key={label} tabIndex={0} role="img" aria-label={`${label}: ${summary}`}>
              <title>{`${label}: ${summary}`}</title>
              {series.map((item) => {
                const height = ((item.values[index] ?? 0) / max) * innerHeight;
                top -= height;
                return height <= 0 ? null : (
                  <rect
                    key={item.key}
                    x={x}
                    y={top}
                    width={barWidth}
                    height={height}
                    fill={chartColor(CHART_COLORS, item.colorIndex)}
                  />
                );
              })}
            </g>
          );
        })}
        {pickLabelIndexes(labels.length).map((index) => (
          <text
            key={`x-${labels[index] ?? index}`}
            x={CHART_PADDING + slot * index + slot / 2}
            y={CHART_HEIGHT - 8}
            fontSize="11"
            textAnchor="middle"
            fill="currentColor"
          >
            {labels[index]}
          </text>
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: chartColor(CHART_COLORS, item.colorIndex) }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
