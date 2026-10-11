import type { ReactElement } from 'react';

import {
  CHART_PRIMARY_COLOR,
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
} from '@/constants/observability-explorer.constants';
import type { LineChartProps } from '@/types/observability-explorer.types';
import { buildLineGeometry, pickLabelIndexes } from '@/utilities/chart.utility';

/**
 * Line and area time series in plain SVG, themed with CSS tokens (so dark mode
 * follows the theme). The picture is `role="img"` with a summary label, and each
 * point is a focusable element with its own label, so keyboard and screen-reader
 * users reach every value. Time runs left to right in every locale.
 */
export function AreaLineChart({
  points,
  ariaLabel,
  emptyLabel,
  formatValue,
}: LineChartProps): ReactElement {
  if (points.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  const geometry = buildLineGeometry(points);
  const baseline = CHART_HEIGHT - CHART_PADDING;

  return (
    <div dir="ltr" className="w-full">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
        data-testid="area-line-chart"
      >
        <line
          x1={CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y1={baseline}
          y2={baseline}
          stroke="hsl(var(--border))"
        />
        <line
          x1={CHART_PADDING}
          x2={CHART_WIDTH - CHART_PADDING}
          y1={CHART_PADDING}
          y2={CHART_PADDING}
          stroke="hsl(var(--border))"
          strokeDasharray="4 4"
        />
        <text x={CHART_PADDING} y={CHART_PADDING - 8} fontSize="11" fill="currentColor">
          {formatValue(geometry.max)}
        </text>
        <path d={geometry.area} fill={CHART_PRIMARY_COLOR} fillOpacity="0.15" />
        <path d={geometry.line} fill="none" stroke={CHART_PRIMARY_COLOR} strokeWidth="2" />
        {geometry.coordinates.map((c, index) => {
          const point = points[index];
          return point === undefined ? null : (
            <circle
              key={point.label}
              cx={c.x}
              cy={c.y}
              r="4"
              fill={CHART_PRIMARY_COLOR}
              tabIndex={0}
              role="img"
              aria-label={`${point.label}: ${formatValue(point.value)}`}
              className="focus-visible:stroke-foreground focus-visible:stroke-2 focus-visible:outline-none"
            >
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </circle>
          );
        })}
        {pickLabelIndexes(points.length).map((index) => {
          const point = points[index];
          const c = geometry.coordinates[index];
          return point === undefined || c === undefined ? null : (
            <text
              key={`x-${point.label}`}
              x={c.x}
              y={CHART_HEIGHT - 8}
              fontSize="11"
              textAnchor="middle"
              fill="currentColor"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
