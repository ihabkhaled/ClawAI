import { describe, expect, it } from 'vitest';
import {
  expandExposurePairs,
  modelKeyVariants,
  requestedPairsMatching,
} from '../exposure-pair.utility';

// Live QA 2026-09-25: the VISION_HELPER role names `GEMINI/gemini-2.5-flash`,
// the Gemini catalog stores `models/gemini-2.5-flash` (EXPOSED), and the exact
// match refused the helper as "unexposed" — every paid helper call failed.
describe('modelKeyVariants', () => {
  it('adds the Gemini models/ spelling to a bare id', () => {
    expect(modelKeyVariants('gemini-2.5-flash')).toEqual([
      'gemini-2.5-flash',
      'models/gemini-2.5-flash',
    ]);
  });

  it('adds the bare spelling to a models/ id', () => {
    expect(modelKeyVariants('models/gemini-2.5-flash')).toEqual([
      'models/gemini-2.5-flash',
      'gemini-2.5-flash',
    ]);
  });

  it('keeps the exact id first so an ordinary exact match is unchanged', () => {
    expect(modelKeyVariants('gpt-4.1-mini')[0]).toBe('gpt-4.1-mini');
  });
});

describe('expandExposurePairs', () => {
  it('queries every spelling under the same provider', () => {
    expect(expandExposurePairs([{ provider: 'GEMINI', model: 'gemini-2.5-flash' }])).toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
      { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
    ]);
  });
});

describe('requestedPairsMatching', () => {
  it('answers in the caller spelling when the catalog stores the models/ form', () => {
    const requested = [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }];
    const rows = [{ provider: 'GEMINI', model: 'models/gemini-2.5-flash' }];
    expect(requestedPairsMatching(requested, rows)).toEqual(requested);
  });

  it('still answers an exact match exactly', () => {
    const requested = [{ provider: 'OPENAI', model: 'gpt-4.1-mini' }];
    expect(requestedPairsMatching(requested, requested)).toEqual(requested);
  });

  it('never matches across providers', () => {
    const requested = [{ provider: 'OPENAI', model: 'gemini-2.5-flash' }];
    const rows = [{ provider: 'GEMINI', model: 'models/gemini-2.5-flash' }];
    expect(requestedPairsMatching(requested, rows)).toEqual([]);
  });

  it('does not widen one model into another', () => {
    const requested = [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }];
    const rows = [{ provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' }];
    expect(requestedPairsMatching(requested, rows)).toEqual([]);
  });

  it('drops a requested pair nothing exposed matches', () => {
    expect(requestedPairsMatching([{ provider: 'GEMINI', model: 'gemini-9' }], [])).toEqual([]);
  });
});
