import { LatencyClass } from '../../../generated/prisma';
import { latencyClassFromP95Ms } from '../utilities/latency-class.utility';

describe('latencyClassFromP95Ms', () => {
  it('returns null when input is null', () => {
    expect(latencyClassFromP95Ms(null)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(latencyClassFromP95Ms(-100)).toBeNull();
  });

  it.each([
    [50, LatencyClass.REALTIME],
    [300, LatencyClass.REALTIME],
    [500, LatencyClass.FAST],
    [1000, LatencyClass.FAST],
    [1500, LatencyClass.MEDIUM],
    [3000, LatencyClass.MEDIUM],
    [5000, LatencyClass.SLOW],
    [10_000, LatencyClass.SLOW],
    [20_000, LatencyClass.HEAVY],
  ])('p95=%s → class=%s', (p95, expected) => {
    expect(latencyClassFromP95Ms(p95)).toBe(expected);
  });
});
