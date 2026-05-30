import { RuntimeProgressStage } from '@claw/shared-types';

import { findBottleneck } from '../../src/runtime-progress/find-bottleneck.utility';

describe('findBottleneck', () => {
  it('returns null for an empty input', () => {
    expect(findBottleneck([])).toBeNull();
  });

  it('returns the only stage at 100% when given a single entry', () => {
    const result = findBottleneck([{ stage: RuntimeProgressStage.GENERATING, durationMs: 1_234 }]);
    expect(result).not.toBeNull();
    expect(result?.stage).toBe(RuntimeProgressStage.GENERATING);
    expect(result?.durationMs).toBe(1_234);
    expect(result?.percentOfTotal).toBeCloseTo(1, 9);
  });

  it('picks the longest stage and computes its share of the total', () => {
    const result = findBottleneck([
      { stage: RuntimeProgressStage.MODEL_LOADING, durationMs: 200 },
      { stage: RuntimeProgressStage.PROMPT_EVAL, durationMs: 50 },
      { stage: RuntimeProgressStage.GENERATING, durationMs: 750 },
      { stage: RuntimeProgressStage.SAVING, durationMs: 100 },
    ]);
    expect(result).not.toBeNull();
    expect(result?.stage).toBe(RuntimeProgressStage.GENERATING);
    expect(result?.durationMs).toBe(750);
    expect(result?.percentOfTotal).toBeCloseTo(750 / 1_100, 6);
  });

  it('percentages of all stages sum to approximately 1.0', () => {
    const stages = [
      { stage: RuntimeProgressStage.MODEL_LOADING, durationMs: 300 },
      { stage: RuntimeProgressStage.PROMPT_EVAL, durationMs: 100 },
      { stage: RuntimeProgressStage.GENERATING, durationMs: 600 },
    ];
    const total = stages.reduce((s, x) => s + x.durationMs, 0);
    const result = findBottleneck(stages);
    expect(result).not.toBeNull();
    // Verify by re-summing every stage's individual percentage.
    const summed = stages.reduce((acc, x) => acc + x.durationMs / total, 0);
    expect(summed).toBeCloseTo(1, 9);
    expect(result?.percentOfTotal).toBeCloseTo(0.6, 9);
  });

  it('returns null when every stage has zero duration', () => {
    expect(
      findBottleneck([
        { stage: RuntimeProgressStage.IDLE, durationMs: 0 },
        { stage: RuntimeProgressStage.GENERATING, durationMs: 0 },
      ]),
    ).toBeNull();
  });

  it('returns null when every stage has invalid/negative durations', () => {
    expect(
      findBottleneck([
        { stage: RuntimeProgressStage.MODEL_LOADING, durationMs: Number.NaN },
        { stage: RuntimeProgressStage.GENERATING, durationMs: -50 },
      ]),
    ).toBeNull();
  });

  it('returns null when given a non-array input', () => {
    // @ts-expect-error — runtime safety check for non-array input
    expect(findBottleneck(undefined)).toBeNull();
    // @ts-expect-error — runtime safety check for non-array input
    expect(findBottleneck(null)).toBeNull();
  });

  it('breaks ties by input order (first max wins)', () => {
    const result = findBottleneck([
      { stage: RuntimeProgressStage.PROMPT_EVAL, durationMs: 500 },
      { stage: RuntimeProgressStage.GENERATING, durationMs: 500 },
    ]);
    expect(result?.stage).toBe(RuntimeProgressStage.PROMPT_EVAL);
  });
});
