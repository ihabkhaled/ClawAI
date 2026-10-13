import { ThreadGenerationStage } from '../../../../generated/prisma';
import { ReviewerRole } from '../../types/reviewer-role.enum';
import {
  CRITIC_STAGE,
  JUDGE_STAGE,
  MIN_CRITIC_SCORE,
  MIN_JUDGE_SCORE,
} from '../generation.constants';
import { UPSTREAM_STATUS_PATTERN } from '../step-recorder.constants';

describe('review stage specs', () => {
  it('pairs each reviewer with its stage and pass mark', () => {
    expect(JUDGE_STAGE).toEqual({
      reviewer: ReviewerRole.JUDGE,
      stage: ThreadGenerationStage.JUDGE,
      minScore: MIN_JUDGE_SCORE,
    });
    expect(CRITIC_STAGE).toEqual({
      reviewer: ReviewerRole.CRITIC,
      stage: ThreadGenerationStage.CRITIC,
      minScore: MIN_CRITIC_SCORE,
    });
  });
});

describe('UPSTREAM_STATUS_PATTERN', () => {
  it('captures the status and the optional upstream code', () => {
    expect(UPSTREAM_STATUS_PATTERN.exec('Chat model request failed (402: PAYG_EXHAUSTED)')).toEqual(
      expect.arrayContaining(['402', 'PAYG_EXHAUSTED']),
    );
    const bare = UPSTREAM_STATUS_PATTERN.exec('Chat model request failed (500)');
    expect(bare?.[1]).toBe('500');
    expect(bare?.[2]).toBeUndefined();
  });

  it('rejects malformed codes and does not hang on long input', () => {
    expect(UPSTREAM_STATUS_PATTERN.test('Chat model request failed (402: lower)')).toBe(false);
    const started = Date.now();
    UPSTREAM_STATUS_PATTERN.test(`Chat model request failed (402: ${'A'.repeat(50_000)}`);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
