import { describe, expect, it } from 'vitest';

import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import type { ThreadRecommendedTeam } from '@/types/thread-recommended-team.types';
import type { ThreadGenerationRequest } from '@/utilities/thread-generation-request.utility';

import {
  availabilityOf,
  isRecommendedSelection,
  teamToSelections,
  toAvailabilityIndex,
  usableModels,
  withSeatFallbacks,
} from '../thread-recommended-team.utility';

const sel = (provider: string, model: string) => ({ provider, model, displayName: model });
const seat = (provider: string, model: string, fallbacks: Array<[string, string]> = []) => ({
  provider,
  model,
  fallbacks: fallbacks.map(([p, m]) => ({ provider: p, model: m })),
});

const team: ThreadRecommendedTeam = {
  authors: [
    seat('GEMINI', 'flash', [['GROK', 'g4']]),
    seat('GROK', 'g4', [['GEMINI', 'flash']]),
    seat('OLLAMA', 'oss', [['GEMINI', 'flash']]),
  ],
  judge: seat('GEMINI', 'pro', [['GROK', 'g4']]),
  critic: seat('GEMINI', 'flash', [['GROK', 'g4']]),
};
const available = [
  sel('GEMINI', 'flash'),
  sel('GEMINI', 'pro'),
  sel('GROK', 'g4'),
  sel('OLLAMA', 'oss'),
];

describe('toAvailabilityIndex / availabilityOf', () => {
  it('reads the service statuses and treats an unlisted model as available', () => {
    const index = toAvailabilityIndex({
      planName: 'Free',
      team: null,
      models: [{ provider: 'GEMINI', model: 'pro', status: ThreadModelAvailability.NeedsPlan }],
    });

    expect(availabilityOf(index, { provider: 'GEMINI', model: 'pro' })).toBe(
      ThreadModelAvailability.NeedsPlan,
    );
    expect(availabilityOf(index, { provider: 'X', model: 'y' })).toBe(
      ThreadModelAvailability.Available,
    );
    expect(toAvailabilityIndex(undefined).size).toBe(0);
  });

  it('keeps only usable models', () => {
    const index = toAvailabilityIndex({
      planName: 'Free',
      team: null,
      models: [{ provider: 'GROK', model: 'g4', status: ThreadModelAvailability.Unavailable }],
    });

    expect(usableModels(available, index).map(({ model }) => model)).toEqual([
      'flash',
      'pro',
      'oss',
    ]);
  });
});

describe('teamToSelections / isRecommendedSelection', () => {
  it('maps the five seats onto picker models in request order', () => {
    const selections = teamToSelections(team, available);

    expect(selections?.map(({ model }) => model)).toEqual(['flash', 'g4', 'oss', 'pro', 'flash']);
    expect(isRecommendedSelection(team, selections ?? [])).toBe(true);
  });

  it('answers null when a seat is not in the picker list or there is no team', () => {
    expect(teamToSelections(team, available.slice(0, 2))).toBeNull();
    expect(teamToSelections(null, available)).toBeNull();
  });

  it('notices a changed seat', () => {
    const changed = [...(teamToSelections(team, available) ?? [])];
    changed[0] = sel('GROK', 'g4');

    expect(isRecommendedSelection(team, changed)).toBe(false);
    expect(isRecommendedSelection(null, changed)).toBe(false);
  });
});

describe('withSeatFallbacks', () => {
  const role = (id: string, provider: string, model: string) => ({
    id,
    provider,
    model,
    maxOutputTokens: 4096,
    fallbacks: [],
  });
  const request = {
    authors: [
      role('author-1', 'GEMINI', 'flash'),
      role('author-2', 'GROK', 'g4'),
      role('author-3', 'OLLAMA', 'oss'),
    ],
    judge: role('judge', 'GEMINI', 'pro'),
    critic: role('critic', 'GEMINI', 'flash'),
  } as unknown as ThreadGenerationRequest;

  it('keeps the service backups on an untouched seat, never on the seat own provider', () => {
    const selected = teamToSelections(team, available) ?? [];
    const result = withSeatFallbacks(request, selected, team, available);

    expect(result.authors[0]?.fallbacks[0]).toEqual({ provider: 'GROK', model: 'g4' });
    for (const entry of [...result.authors, result.judge, result.critic]) {
      expect(entry.fallbacks.length).toBeLessThanOrEqual(2);
      expect(entry.fallbacks.every((fallback) => fallback.provider !== entry.provider)).toBe(true);
    }
  });

  it('takes the ranked usable models for a seat the owner changed', () => {
    const selected = [sel('OLLAMA', 'oss'), ...(teamToSelections(team, available) ?? []).slice(1)];
    const changed = {
      ...request,
      authors: [role('author-1', 'OLLAMA', 'oss'), request.authors[1], request.authors[2]],
    } as unknown as ThreadGenerationRequest;
    const result = withSeatFallbacks(changed, selected, team, [
      sel('GROK', 'g4'),
      sel('GEMINI', 'flash'),
    ]);

    expect(result.authors[0]?.fallbacks).toEqual([
      { provider: 'GROK', model: 'g4' },
      { provider: 'GEMINI', model: 'flash' },
    ]);
  });
});
