import { buildRuntimeV2UsageEvent } from '../runtime-v2-usage.utility';

describe('buildRuntimeV2UsageEvent', () => {
  it('builds a run.usage event whose only payload key is costMicros', () => {
    const event = buildRuntimeV2UsageEvent(21_000);
    expect(event).toEqual({ type: 'run.usage', payload: { costMicros: 21_000 } });
    // Nothing that could carry provider cost or margin may ride beside it.
    expect(Object.keys(event?.payload ?? {})).toEqual(['costMicros']);
  });

  it('keeps zero, a real cost', () => {
    expect(buildRuntimeV2UsageEvent(0)).toEqual({ type: 'run.usage', payload: { costMicros: 0 } });
  });

  it.each([1.5, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 2])(
    'publishes nothing for %s rather than a rounded guess',
    (costMicros) => {
      expect(buildRuntimeV2UsageEvent(costMicros)).toBeNull();
    },
  );
});
