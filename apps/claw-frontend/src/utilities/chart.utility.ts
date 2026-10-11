import {
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
  DONUT_RADIUS,
  DONUT_SIZE,
  MAX_X_LABELS,
} from '@/constants/observability-explorer.constants';
import type { ChartPoint, DonutArc, DonutSlice } from '@/types/observability-explorer.types';

export type LineGeometry = {
  line: string;
  area: string;
  coordinates: Array<{ x: number; y: number }>;
  max: number;
};

/** Top of the value axis: the largest value, or 1 so an all-zero series still draws a baseline. */
export function axisMax(values: number[]): number {
  const max = Math.max(0, ...values);
  return max > 0 ? max : 1;
}

/** Path data for a line and the area under it, in the chart's own coordinate space. */
export function buildLineGeometry(points: ChartPoint[]): LineGeometry {
  const max = axisMax(points.map((point) => point.value));
  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const baseline = CHART_HEIGHT - CHART_PADDING;
  const coordinates = points.map((point, index) => ({
    x:
      points.length === 1
        ? CHART_WIDTH / 2
        : CHART_PADDING + (index / (points.length - 1)) * innerWidth,
    y: baseline - (point.value / max) * innerHeight,
  }));
  const line = coordinates
    .map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const area =
    first === undefined || last === undefined
      ? ''
      : `${line} L${last.x.toFixed(1)} ${baseline} L${first.x.toFixed(1)} ${baseline} Z`;
  return { line, area, coordinates, max };
}

/** Indexes to label on the x axis: evenly spread, first and last included. */
export function pickLabelIndexes(count: number, maxLabels = MAX_X_LABELS): number[] {
  if (count <= maxLabels) {
    return Array.from({ length: count }, (_, index) => index);
  }
  const step = (count - 1) / (maxLabels - 1);
  const picked = new Set<number>();
  for (let i = 0; i < maxLabels; i += 1) {
    picked.add(Math.round(i * step));
  }
  return [...picked];
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/** Donut arcs (stroked paths) for positive slices. One slice covering everything is drawn as two halves. */
export function buildDonutArcs(slices: DonutSlice[]): DonutArc[] {
  const positive = slices.filter((slice) => slice.value > 0);
  const total = positive.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return [];
  }
  const center = DONUT_SIZE / 2;
  let start = -Math.PI / 2;
  return positive.map((slice, index) => {
    const fraction = slice.value / total;
    // A full circle cannot be one SVG arc (start equals end), so stop just short of it.
    const sweep = Math.min(fraction, 0.9999) * Math.PI * 2;
    const end = start + sweep;
    const from = polar(center, center, DONUT_RADIUS, start);
    const to = polar(center, center, DONUT_RADIUS, end);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M${from.x.toFixed(2)} ${from.y.toFixed(2)} A${DONUT_RADIUS} ${DONUT_RADIUS} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
    start = end;
    return {
      key: slice.key,
      label: slice.label,
      value: slice.value,
      path,
      colorIndex: index,
      percent: Math.round(fraction * 100),
    };
  });
}

export function chartColor(colors: readonly string[], index: number): string {
  return colors[index % colors.length] ?? 'currentColor';
}
