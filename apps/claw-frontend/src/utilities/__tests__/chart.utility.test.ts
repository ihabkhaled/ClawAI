import { describe, expect, it } from 'vitest';

import {
  axisMax,
  buildDonutArcs,
  buildLineGeometry,
  chartColor,
  pickLabelIndexes,
} from '@/utilities/chart.utility';

describe('chart utilities', () => {
  it('uses 1 as the axis top for an all-zero series so a baseline still draws', () => {
    expect(axisMax([0, 0])).toBe(1);
    expect(axisMax([3, 9, 2])).toBe(9);
  });

  it('builds a line, an area and one coordinate per point', () => {
    const geometry = buildLineGeometry([
      { label: 'a', value: 1 },
      { label: 'b', value: 4 },
      { label: 'c', value: 2 },
    ]);
    expect(geometry.coordinates).toHaveLength(3);
    expect(geometry.line.startsWith('M')).toBe(true);
    expect(geometry.area.endsWith('Z')).toBe(true);
    // The tallest value sits highest (smallest y).
    const ys = geometry.coordinates.map((c) => c.y);
    expect(Math.min(...ys)).toBe(ys[1]);
  });

  it('draws a single point in the middle and an empty series as nothing', () => {
    expect(buildLineGeometry([{ label: 'a', value: 1 }]).coordinates).toHaveLength(1);
    expect(buildLineGeometry([]).area).toBe('');
  });

  it('labels every index when few, and evenly spread with both ends when many', () => {
    expect(pickLabelIndexes(3)).toEqual([0, 1, 2]);
    const spread = pickLabelIndexes(30, 6);
    expect(spread[0]).toBe(0);
    expect(spread[spread.length - 1]).toBe(29);
    expect(spread.length).toBeLessThanOrEqual(6);
  });

  it('builds donut arcs only for positive slices with percents that follow the shares', () => {
    const arcs = buildDonutArcs([
      { key: 'a', label: 'A', value: 3 },
      { key: 'b', label: 'B', value: 1 },
      { key: 'c', label: 'C', value: 0 },
    ]);
    expect(arcs.map((arc) => arc.key)).toEqual(['a', 'b']);
    expect(arcs.map((arc) => arc.percent)).toEqual([75, 25]);
    expect(buildDonutArcs([{ key: 'a', label: 'A', value: 0 }])).toEqual([]);
  });

  it('draws a lone slice as a path that does not collapse to a point', () => {
    const [arc] = buildDonutArcs([{ key: 'a', label: 'A', value: 5 }]);
    expect(arc?.percent).toBe(100);
    expect(arc?.path).toContain('A');
  });

  it('wraps colours around the palette', () => {
    expect(chartColor(['x', 'y'], 3)).toBe('y');
  });
});
