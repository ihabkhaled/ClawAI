import { beforeEach, describe, expect, it } from 'vitest';

import { MetricsRegistry } from '../metrics-registry.utility';
import { escapeMetricLabelValue } from '../metric-labels.utility';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('renders a counter with HELP, TYPE and one line per series', () => {
    const counter = registry.counter({
      name: 'claw_test_total',
      help: 'A test counter.',
      labels: { provider: ['gemini', 'openai'], outcome: ['success', 'failed'] },
    });
    counter.inc({ provider: 'GEMINI', outcome: 'success' });
    counter.inc({ provider: 'gemini', outcome: 'SUCCESS' }, 2);
    counter.inc({ provider: 'openai', outcome: 'failed' });

    expect(registry.render()).toBe(
      [
        '# HELP claw_test_total A test counter.',
        '# TYPE claw_test_total counter',
        'claw_test_total{provider="gemini",outcome="success"} 3',
        'claw_test_total{provider="openai",outcome="failed"} 1',
        '',
      ].join('\n'),
    );
  });

  it('folds an undeclared value, a missing label and an extra key into bounded output', () => {
    const counter = registry.counter({
      name: 'claw_bounded_total',
      help: 'Bounded.',
      labels: { outcome: ['success'] },
    });
    counter.inc({ outcome: 'user-4f1c9a' });
    counter.inc({});
    counter.inc({ outcome: 'success', userId: 'u_123', fileId: 'f_456' });

    const text = registry.render();
    expect(text).toContain('claw_bounded_total{outcome="other"} 2');
    expect(text).toContain('claw_bounded_total{outcome="success"} 1');
    expect(text).not.toContain('u_123');
    expect(text).not.toContain('f_456');
    expect(text).not.toContain('user-4f1c9a');
  });

  it('ignores a negative or non-finite increment instead of throwing', () => {
    const counter = registry.counter({ name: 'claw_safe_total', help: 'h', labels: {} });
    counter.inc({}, -1);
    counter.inc({}, Number.NaN);
    counter.inc({});
    expect(registry.render()).toContain('claw_safe_total 1');
  });

  it('renders cumulative histogram buckets, +Inf, sum and count', () => {
    const histogram = registry.histogram({
      name: 'claw_duration_seconds',
      help: 'Durations.',
      labels: { outcome: ['ok'] },
      buckets: [1, 5],
    });
    histogram.observe({ outcome: 'ok' }, 0.5);
    histogram.observe({ outcome: 'ok' }, 3);
    histogram.observe({ outcome: 'ok' }, 30);
    histogram.observe({ outcome: 'ok' }, -2);
    histogram.observe({ outcome: 'ok' }, Number.POSITIVE_INFINITY);

    expect(registry.render()).toBe(
      [
        '# HELP claw_duration_seconds Durations.',
        '# TYPE claw_duration_seconds histogram',
        'claw_duration_seconds_bucket{outcome="ok",le="1"} 1',
        'claw_duration_seconds_bucket{outcome="ok",le="5"} 2',
        'claw_duration_seconds_bucket{outcome="ok",le="+Inf"} 3',
        'claw_duration_seconds_sum{outcome="ok"} 33.5',
        'claw_duration_seconds_count{outcome="ok"} 3',
        '',
      ].join('\n'),
    );
  });

  it('returns the same series for a repeated declaration', () => {
    const definition = { name: 'claw_again_total', help: 'h', labels: { a: ['x'] } };
    registry.counter(definition).inc({ a: 'x' });
    registry.counter(definition).inc({ a: 'x' });
    expect(registry.render()).toContain('claw_again_total{a="x"} 2');
  });

  it('refuses bad declarations at boot', () => {
    expect(() => registry.counter({ name: 'Bad-Name', help: 'h', labels: {} })).toThrow(
      /not a valid Prometheus name/,
    );
    expect(() =>
      registry.counter({ name: 'claw_x_total', help: 'h', labels: { le: ['1'] } }),
    ).toThrow(/reserved/);
    expect(() => registry.counter({ name: 'claw_y_total', help: 'h', labels: { a: [] } })).toThrow(
      /declares no values/,
    );
    expect(() =>
      registry.histogram({ name: 'claw_h', help: 'h', labels: {}, buckets: [5, 1] }),
    ).toThrow(/ascending/);
    expect(() =>
      registry.histogram({ name: 'claw_h2', help: 'h', labels: {}, buckets: [] }),
    ).toThrow(/ascending/);
    registry.counter({ name: 'claw_shared', help: 'h', labels: {} });
    expect(() =>
      registry.histogram({ name: 'claw_shared', help: 'h', labels: {}, buckets: [1] }),
    ).toThrow(/another type/);
    registry.histogram({ name: 'claw_shared_h', help: 'h', labels: {}, buckets: [1] });
    expect(() => registry.counter({ name: 'claw_shared_h', help: 'h', labels: {} })).toThrow(
      /another type/,
    );
  });

  it('reset clears samples but keeps declarations', () => {
    registry.counter({ name: 'claw_reset_total', help: 'h', labels: {} }).inc({});
    registry
      .histogram({ name: 'claw_reset_seconds', help: 'h', labels: {}, buckets: [1] })
      .observe({}, 0.5);
    registry.reset();
    expect(registry.render()).toBe(
      [
        '# HELP claw_reset_total h',
        '# TYPE claw_reset_total counter',
        '# HELP claw_reset_seconds h',
        '# TYPE claw_reset_seconds histogram',
        '',
      ].join('\n'),
    );
  });

  it('keeps a multi-line help text on one line', () => {
    registry.counter({ name: 'claw_help_total', help: 'line one\nline two', labels: {} });
    expect(registry.render()).toContain('# HELP claw_help_total line one line two');
  });
});

describe('escapeMetricLabelValue', () => {
  it('escapes the three characters that can break a sample line', () => {
    expect(escapeMetricLabelValue('a\\b"c\nd')).toBe('a\\\\b\\"c\\nd');
  });
});
