import { describe, expect, it } from 'vitest';

import {
  formatPolicyWeightsJson,
  parsePolicyWeightsJson,
} from '@/utilities/policy-weights.utility';

const DIMENSIONS = [
  'capability',
  'domain',
  'role',
  'modality',
  'cost',
  'latency',
  'health',
  'privacy',
  'learnedSuccess',
  'judgeTrust',
  'contextFit',
  'uncertaintyPenalty',
  'riskPenalty',
  'fallbackReliability',
];

function makeValidWeightsString(): string {
  const v = 1 / DIMENSIONS.length;
  const obj: Record<string, number> = {};
  for (const d of DIMENSIONS) {
    obj[d] = v;
  }
  return JSON.stringify(obj);
}

describe('parsePolicyWeightsJson', () => {
  it('returns ok with empty weights when input is blank', () => {
    const result = parsePolicyWeightsJson('   ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.weights).toEqual({});
    }
  });

  it('rejects when input is not valid JSON', () => {
    const result = parsePolicyWeightsJson('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe('routing.weightsJsonError.invalidJson');
    }
  });

  it('rejects when parsed JSON is not an object', () => {
    const result = parsePolicyWeightsJson('[1, 2, 3]');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe('routing.weightsJsonError.notAnObject');
    }
  });

  it('rejects when a dimension is missing', () => {
    const result = parsePolicyWeightsJson('{"capability": 1.0}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe('routing.weightsJsonError.missingDimension');
    }
  });

  it('rejects when weights do not sum to 1.0', () => {
    const obj: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      obj[d] = 0.5;
    }
    const result = parsePolicyWeightsJson(JSON.stringify(obj));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe('routing.weightsJsonError.sumNotOne');
    }
  });

  it('accepts a balanced 14-dimension vector that sums to 1.0', () => {
    const result = parsePolicyWeightsJson(makeValidWeightsString());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = Object.values(result.weights).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThanOrEqual(0.001);
    }
  });
});

describe('formatPolicyWeightsJson', () => {
  it('returns empty string when config is undefined', () => {
    expect(formatPolicyWeightsJson(undefined)).toBe('');
  });

  it('returns empty string when weightsJson key is missing', () => {
    expect(formatPolicyWeightsJson({})).toBe('');
  });

  it('returns pretty-printed JSON when weightsJson is an object', () => {
    const formatted = formatPolicyWeightsJson({ weightsJson: { capability: 0.5, role: 0.5 } });
    expect(formatted).toContain('"capability": 0.5');
    expect(formatted).toContain('"role": 0.5');
  });

  it('returns empty string when weightsJson is null', () => {
    expect(formatPolicyWeightsJson({ weightsJson: null })).toBe('');
  });
});
