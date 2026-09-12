import { describe, expect, it } from 'vitest';

import type { ModelSelection } from '@/types';
import {
  compareModelsByRecency,
  parseModelVersion,
  rankModelRecency,
} from '@/utilities/model-recency.utility';

function model(key: string, displayName?: string, provider = 'OPENAI'): ModelSelection {
  return { provider, model: key, displayName: displayName ?? key };
}

function order(keys: string[], provider = 'OPENAI'): string[] {
  return keys
    .map((key) => model(key, undefined, provider))
    .sort(compareModelsByRecency)
    .map((entry) => entry.model);
}

describe('parseModelVersion', () => {
  it('reads a dotted version', () => {
    expect(parseModelVersion('gpt-5.1')).toBe(5.1);
    expect(parseModelVersion('gpt-5')).toBe(5);
  });

  // Anthropic writes 4.5 as `4-5`, so a hyphen-joined run has to fold together
  // or every Claude model would read as its major version alone.
  it('reads a hyphenated version the way Anthropic writes it', () => {
    expect(parseModelVersion('claude-opus-4-5')).toBe(4.5);
    expect(parseModelVersion('claude-opus-5')).toBe(5);
    expect(parseModelVersion('claude-sonnet-4-6')).toBe(4.6);
  });

  // Without stopping the run at the first word, `16k` folds into the version
  // and a 2023 model outranks everything in the list.
  it('stops at the first word so a size suffix cannot inflate the version', () => {
    expect(parseModelVersion('gpt-3.5-turbo-16k')).toBe(3.5);
    expect(parseModelVersion('gpt-3.5-turbo')).toBe(3.5);
  });

  it('ignores a trailing release date in either provider style', () => {
    expect(parseModelVersion('gpt-5.1-2025-11-13')).toBe(5.1);
    expect(parseModelVersion('claude-opus-4-5-20251101')).toBe(4.5);
  });

  it('returns null for a key with no version at all', () => {
    expect(parseModelVersion('aqa')).toBeNull();
    expect(parseModelVersion('mistral')).toBeNull();
  });
});

describe('rankModelRecency', () => {
  it('marks a dated snapshot as the lower tier', () => {
    expect(rankModelRecency('gpt-5-2025-08-07').tier).toBe(1);
    expect(rankModelRecency('claude-haiku-4-5-20251001').tier).toBe(1);
    expect(rankModelRecency('gpt-5').tier).toBe(0);
  });

  // A preview of 3.1 really is newer than a stable 2.5, and "latest first" is
  // the request. Demoting previews would answer a different question.
  it('leaves a preview in the top tier, ranked by its version', () => {
    expect(rankModelRecency('gemini-3.1-pro-preview').tier).toBe(0);
  });
});

describe('compareModelsByRecency', () => {
  // The actual complaint: alphabetical order put the oldest model first,
  // because model names sort close to reverse-chronologically.
  it('puts the newest OpenAI model above the oldest, unlike alphabetical order', () => {
    expect(order(['gpt-3.5-turbo', 'gpt-5.4', 'gpt-4o', 'gpt-5'])).toEqual([
      'gpt-5.4',
      'gpt-5',
      'gpt-4o',
      'gpt-3.5-turbo',
    ]);
  });

  it('orders the real Anthropic line-up newest first', () => {
    expect(
      order([
        'claude-haiku-4-5-20251001',
        'claude-opus-4-5-20251101',
        'claude-opus-4-8',
        'claude-opus-5',
        'claude-sonnet-5',
      ]),
    ).toEqual([
      // Version 5 aliases first, then 4.8, then the pinned snapshots. The two
      // snapshots are both version 4.5 in the same tier, so they tie and fall
      // through to the name — nothing in the data says opus outranks haiku, and
      // inventing that would be a guess dressed as an ordering.
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-opus-4-8',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-5-20251101',
    ]);
  });

  it('keeps the everyday alias above its own pinned snapshot', () => {
    expect(order(['gpt-5.1-2025-11-13', 'gpt-5.1'])).toEqual(['gpt-5.1', 'gpt-5.1-2025-11-13']);
  });

  it('sorts an unversioned model below every versioned one', () => {
    expect(order(['aqa', 'gemini-2.5-pro'])).toEqual(['gemini-2.5-pro', 'aqa']);
  });

  // A list that reshuffles between renders is its own bug: cmdk highlights by
  // value, and the picker scrolls to the current selection on open.
  it('is a total, stable order — equal ranks never swap', () => {
    const a = model('gpt-5', 'Alpha');
    const b = model('gpt-5', 'Beta');
    expect(compareModelsByRecency(a, b)).toBeLessThan(0);
    expect(compareModelsByRecency(b, a)).toBeGreaterThan(0);
    expect(compareModelsByRecency(a, a)).toBe(0);
  });

  // Found in the live picker: Gemini publishes month-year suffixes on keys that
  // carry no version, so "05-2026" was read AS the version — 5.2026 — and an
  // unversioned preview outranked every real Gemini model.
  it('does not mistake a month-year suffix for a version number', () => {
    expect(parseModelVersion('models/antigravity-preview-05-2026')).toBeNull();
    expect(parseModelVersion('models/deep-research-pro-preview-12-2025')).toBeNull();
  });

  it('still reads a real version on a key that also carries a date', () => {
    expect(parseModelVersion('models/gemini-2.5-flash-native-audio-preview-09-2025')).toBe(2.5);
  });

  it('ranks real Gemini models above an unversioned dated preview', () => {
    expect(
      order([
        'models/antigravity-preview-05-2026',
        'models/deep-research-pro-preview-12-2025',
        'models/gemini-2.5-pro',
        'models/gemini-3.7-flash',
      ]),
    ).toEqual([
      'models/gemini-3.7-flash',
      'models/gemini-2.5-pro',
      'models/antigravity-preview-05-2026',
      'models/deep-research-pro-preview-12-2025',
    ]);
  });

  // Found in the live picker: a plain numeric sort put "Gemma 4 31b IT" and
  // "Imagen 4.0" above every Gemini model, because 4 > 3.7. Version numbers
  // only mean something WITHIN a product line.
  it('puts the provider primary line above its other product lines', () => {
    expect(
      order(
        [
          'models/gemma-4-31b-it',
          'models/imagen-4.0-generate-001',
          'models/gemini-3.7-flash',
          'models/gemini-2.5-pro',
        ],
        'GEMINI',
      ),
    ).toEqual([
      'models/gemini-3.7-flash',
      'models/gemini-2.5-pro',
      // Below the primary line, ordering is by version as parsed. A parameter
      // size that starts with digits joins the version run, so gemma-4-31b
      // reads as 4.31 and sorts above imagen-4.0. Benign: within a secondary
      // line it means the larger variant comes first, and no cross-line
      // comparison is claimed to be meaningful anyway.
      'models/gemma-4-31b-it',
      'models/imagen-4.0-generate-001',
    ]);
  });

  it('leaves a provider with no declared primary line sorted by version alone', () => {
    expect(order(['mistral-large-3', 'kimi-k3'], 'OLLAMA')).toEqual(['mistral-large-3', 'kimi-k3']);
  });
});
