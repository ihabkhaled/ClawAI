import { PreferenceClassifierManager } from '../managers/preference-classifier.manager';
import type { AiActionDecisionEvent } from '../types/learning.types';

const baseEvent: AiActionDecisionEvent = {
  queueId: 'q1',
  userId: 'u1',
  connectorId: 'c1',
  provider: 'GITHUB',
  actionKind: 'DRAFT',
  occurredAt: new Date().toISOString(),
  decision: 'EDITED',
};

describe('PreferenceClassifierManager', () => {
  const classifier = new PreferenceClassifierManager();

  it('emits "prefers shorter" when edit shrinks length sharply', () => {
    const event: AiActionDecisionEvent = {
      ...baseEvent,
      decision: 'EDITED',
      editDiff: { before: 'a'.repeat(200), after: 'a'.repeat(50) },
    };
    const result = classifier.classify(event);
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toContain('shorter');
    expect(result[0]?.actionKind).toBe('DRAFT');
  });

  it('emits "more detail" when edit expands length sharply', () => {
    const event: AiActionDecisionEvent = {
      ...baseEvent,
      decision: 'EDITED',
      editDiff: { before: 'short', after: 'much longer text expanded greatly here' },
    };
    const result = classifier.classify(event);
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toContain('more detail');
  });

  it('emits nothing for small edit', () => {
    const event: AiActionDecisionEvent = {
      ...baseEvent,
      decision: 'EDITED',
      editDiff: { before: 'hello there friend', after: 'Hello there friend.' },
    };
    expect(classifier.classify(event)).toEqual([]);
  });

  it('emits rejection signal when reasonText is meaningful', () => {
    const event: AiActionDecisionEvent = {
      ...baseEvent,
      decision: 'REJECTED',
      reasonText: 'too formal — match my casual tone',
    };
    const result = classifier.classify(event);
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toContain('rejects');
  });

  it('skips short rejection reasons', () => {
    const event: AiActionDecisionEvent = {
      ...baseEvent,
      decision: 'REJECTED',
      reasonText: 'no',
    };
    expect(classifier.classify(event)).toEqual([]);
  });

  it('emits low-confidence "user accepts" pref on plain APPROVED with provider', () => {
    const result = classifier.classify({ ...baseEvent, decision: 'APPROVED' });
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toContain('approves');
    expect(result[0]?.confidence).toBeLessThan(0.5);
  });

  it('emits low-confidence "user accepts" pref on AUTO_APPROVED with provider', () => {
    const result = classifier.classify({ ...baseEvent, decision: 'AUTO_APPROVED' });
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBeLessThan(0.5);
  });

  it('returns empty for APPROVED without provider (avoids noise)', () => {
    expect(
      classifier.classify({ ...baseEvent, decision: 'APPROVED', provider: null }),
    ).toEqual([]);
  });

  it('returns empty when EDITED has no diff', () => {
    expect(classifier.classify({ ...baseEvent, decision: 'EDITED' })).toEqual([]);
  });
});
