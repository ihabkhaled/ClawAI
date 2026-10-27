import type { StepRow } from '../../types/step-recorder.types';
import { latestReviewVerdict } from '../review-failure.utility';
import { parseVerdict, serializeVerdict } from '../review-verdict.utility';

const review = { score: 84, blockers: ['the article does not cite independent primary sources'] };

const step = (excerpt: string): StepRow => ({
  seq: 7,
  at: new Date(0),
  stage: 'JUDGE',
  round: 3,
  outcome: 'RETRY',
  roleKind: 'JUDGE',
  roleId: 'judge',
  provider: 'SHARED',
  model: 'shared-fallback',
  code: 'JUDGE_BLOCKED',
  httpStatus: null,
  durationMs: null,
  inputTokens: null,
  outputTokens: null,
  excerpt,
});

describe('the model that really reviewed is part of the verdict (ADR-195)', () => {
  it('round-trips the reviewer and says when it replaced the chosen model', () => {
    const reviewer = { provider: 'SHARED', model: 'shared-fallback', fallback: true };

    const record = parseVerdict(serializeVerdict(review, 80, reviewer));

    expect(record?.reviewer).toEqual(reviewer);
    expect(record?.score).toBe(84);
  });

  it('reaches progress.failure.review as reviewerModel, next to the blockers', () => {
    const reviewer = { provider: 'OLLAMA_CLOUD', model: 'glm-5.3', fallback: true };

    const verdict = latestReviewVerdict([step(serializeVerdict(review, 80, reviewer))]);

    expect(verdict?.reviewerModel).toEqual(reviewer);
    expect(verdict?.evidenceGapBlockers).toEqual(review.blockers);
    expect(verdict?.blocked).toBe(true);
  });

  it('is absent for an older step, and an old record still parses', () => {
    const verdict = latestReviewVerdict([step(serializeVerdict(review, 80))]);

    expect(verdict).not.toBeNull();
    expect(verdict).not.toHaveProperty('reviewerModel');
    expect(parseVerdict(JSON.stringify({ score: 70, minScore: 80, blockers: [] }))).toEqual({
      score: 70,
      minScore: 80,
      blockers: [],
    });
  });

  it('records a reviewer that is the chosen model as not a fallback', () => {
    const reviewer = { provider: 'OPENAI', model: 'gpt', fallback: false };

    expect(parseVerdict(serializeVerdict(review, 80, reviewer))?.reviewer?.fallback).toBe(false);
  });
});
