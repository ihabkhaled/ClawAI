import { ModelAuthorizationDenialReason } from '../../enums/model-authorization-denial-reason.enum';
import { ModelAuthorizationMetricsService } from '../model-authorization-metrics.service';

describe('ModelAuthorizationMetricsService', () => {
  let metrics: ModelAuthorizationMetricsService;

  beforeEach(() => {
    metrics = new ModelAuthorizationMetricsService();
    metrics.reset();
  });

  it('starts empty rather than reporting a misleading zero-latency window', () => {
    const snapshot = metrics.snapshot();

    expect(snapshot.allowed).toBe(0);
    expect(snapshot.denied).toBe(0);
    expect(snapshot.latency).toEqual({ samples: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 });
  });

  it('keeps denial reasons apart', () => {
    // The point of the split: an exposure denial and a plan denial are
    // different incidents, and a single "denied" total cannot tell them apart.
    metrics.recordDenied(ModelAuthorizationDenialReason.PLAN, 4);
    metrics.recordDenied(ModelAuthorizationDenialReason.EXPOSURE, 9);
    metrics.recordDenied(ModelAuthorizationDenialReason.EXPOSURE, 11);
    metrics.recordAllowed(2);

    const snapshot = metrics.snapshot();

    expect(snapshot.allowed).toBe(1);
    expect(snapshot.denied).toBe(3);
    expect(snapshot.denialsByReason).toEqual({
      PLAN: 1,
      EXPOSURE: 2,
      EXECUTION_EXPOSURE: 0,
    });
  });

  it('reports percentiles over the recorded window', () => {
    for (let value = 1; value <= 100; value += 1) {
      metrics.recordAllowed(value);
    }

    const { latency } = metrics.snapshot();

    expect(latency.samples).toBe(100);
    expect(latency.p50Ms).toBe(51);
    expect(latency.p95Ms).toBe(96);
    expect(latency.maxMs).toBe(100);
  });

  it('bounds the latency window so a long-lived process cannot grow it forever', () => {
    for (let index = 0; index < 900; index += 1) {
      metrics.recordAllowed(index);
    }

    expect(metrics.snapshot().latency.samples).toBe(512);
  });

  it('shares counters across instances because the gate has two halves', () => {
    // Both deny sites build their own collaborators. A per-instance counter
    // would report whichever half the reader reached.
    const entryGate = new ModelAuthorizationMetricsService();
    const executionGate = new ModelAuthorizationMetricsService();

    entryGate.recordDenied(ModelAuthorizationDenialReason.EXPOSURE, 3);
    executionGate.recordDenied(ModelAuthorizationDenialReason.EXECUTION_EXPOSURE, 3);

    expect(entryGate.snapshot().denied).toBe(2);
    expect(executionGate.snapshot().denied).toBe(2);
  });
});
