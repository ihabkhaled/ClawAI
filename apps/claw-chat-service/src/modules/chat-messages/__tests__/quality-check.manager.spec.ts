import { QualityCheckManager } from '../managers/quality-check.manager';

describe('QualityCheckManager', () => {
  let manager: QualityCheckManager;

  beforeEach(() => {
    manager = new QualityCheckManager();
  });

  it('flags prior answer bleed when the new answer matches an older assistant reply more than the new prompt', () => {
    const result = manager.checkResponseQuality(
      'Semi-Circle Shape Concept with heart symbol and privacy-focused logo directions.',
      'Refactor a callback-heavy handler into async await with structured error handling.',
      undefined,
      ['Semi-Circle Shape Concept with heart symbol and privacy-focused logo directions.'],
    );

    expect(result.isWeak).toBe(true);
    expect(result.reasons).toContain('prior_answer_bleed');
  });

  it('does not flag prior answer bleed for a fresh on-topic answer', () => {
    const result = manager.checkResponseQuality(
      'Refactor the callback chain into async functions, centralize errors in one boundary, and add typed retry logging.',
      'Refactor a callback-heavy handler into async await with structured error handling.',
      undefined,
      ['Semi-Circle Shape Concept with heart symbol and privacy-focused logo directions.'],
    );

    expect(result.reasons).not.toContain('prior_answer_bleed');
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('recommends reroute when prior answer bleed is detected', () => {
    const quality = manager.checkResponseQuality(
      'Semi-Circle Shape Concept with heart symbol and privacy-focused logo directions.',
      'Refactor a callback-heavy handler into async await with structured error handling.',
      undefined,
      ['Semi-Circle Shape Concept with heart symbol and privacy-focused logo directions.'],
    );

    const decision = manager.shouldReRoute(quality, 0);

    expect(quality.isWeak).toBe(true);
    expect(decision.shouldReRoute).toBe(true);
    expect(decision.reason).toContain('prior_answer_bleed');
  });

  it('does not punish concise valid reasoning answers with the generic long-answer length floor', () => {
    const result = manager.checkResponseQuality(
      'Use the safer option because it lowers coupling, shrinks rollback risk, and is easier to test.',
      'Compare three rollout strategies and pick one with reasons.',
    );

    expect(result.reasons).not.toContain('response_too_short');
    expect(result.reasons).not.toContain('too_few_words');
    expect(result.isWeak).toBe(false);
  });
});
