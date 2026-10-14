import { CandidateOrigin } from '../../../../common/enums/candidate-origin.enum';
import type { QueuedCandidate } from '../../types/healing.types';
import { candidateKey, preferDistinctModels } from '../healing-candidates.utility';

const queued = (provider: string, model: string, origin: CandidateOrigin): QueuedCandidate => ({
  provider,
  model,
  origin,
});

describe('preferDistinctModels (ADR-183)', () => {
  const queue = [
    queued('GEMINI', 'flash', CandidateOrigin.PRIMARY),
    queued('GROK', 'grok-4', CandidateOrigin.TEAM),
    queued('OLLAMA', 'kimi', CandidateOrigin.POOL),
    queued('GROQ', 'oss', CandidateOrigin.SAFE_DEFAULT),
  ];

  it('moves a fallback another author already uses behind the ones that are not taken', () => {
    const result = preferDistinctModels(queue, new Set(['GROK/grok-4']));
    expect(result.map(candidateKey)).toEqual([
      'GEMINI/flash',
      'OLLAMA/kimi',
      'GROQ/oss',
      'GROK/grok-4',
    ]);
  });

  it('keeps the role own pick in place even when another author picked the same model', () => {
    const result = preferDistinctModels(queue, new Set(['GEMINI/flash']));
    expect(result.map(candidateKey)).toEqual([
      'GEMINI/flash',
      'GROK/grok-4',
      'OLLAMA/kimi',
      'GROQ/oss',
    ]);
  });

  it('still returns every candidate when all of them are taken, in their old order', () => {
    const all = new Set(queue.map(candidateKey));
    expect(preferDistinctModels(queue, all).map(candidateKey)).toEqual(queue.map(candidateKey));
  });

  it('is a plain copy when nothing is taken', () => {
    expect(preferDistinctModels(queue, new Set())).toEqual(queue);
  });
});
