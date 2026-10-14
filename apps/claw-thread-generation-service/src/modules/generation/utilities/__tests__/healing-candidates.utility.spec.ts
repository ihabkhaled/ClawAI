import { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';

import { CandidateOrigin } from '../../../../common/enums/candidate-origin.enum';
import type { ModelRole } from '../../types/generation-pipeline.types';
import type { CandidateHealth, QueuedCandidate } from '../../types/healing.types';
import {
  buildCandidateQueue,
  candidateKey,
  orderAfterFailure,
  swapStrategy,
} from '../healing-candidates.utility';

const role: ModelRole = {
  id: 'author-1',
  provider: 'OPENROUTER',
  model: 'a',
  maxOutputTokens: 4096,
  fallbacks: [
    { provider: 'OPENROUTER', model: 'b' },
    { provider: 'OPENROUTER', model: 'a' },
  ],
};

const base = {
  role,
  demoted: new Set<string>(),
  health: new Map<string, CandidateHealth>(),
  neededTokens: 10_000,
};

const keys = (queue: readonly QueuedCandidate[]): string[] => queue.map(candidateKey);

describe('buildCandidateQueue (ADR-181 candidates)', () => {
  it('lists the primary, then the owner backups, then the pool, then the safe default', () => {
    const queue = buildCandidateQueue({
      ...base,
      healing: {
        pool: [
          { provider: 'GEMINI', model: 'p1' },
          { provider: 'GROK', model: 'p2' },
        ],
        safeDefault: { provider: 'GEMINI', model: 'flash' },
      },
    });
    expect(keys(queue)).toEqual([
      'OPENROUTER/a',
      'OPENROUTER/b',
      'GEMINI/p1',
      'GROK/p2',
      'GEMINI/flash',
    ]);
    expect(queue.map((item) => item.origin)).toEqual([
      CandidateOrigin.PRIMARY,
      CandidateOrigin.TEAM,
      CandidateOrigin.POOL,
      CandidateOrigin.POOL,
      CandidateOrigin.SAFE_DEFAULT,
    ]);
  });

  it('keeps a different model of the same provider and lists an identical one once', () => {
    expect(keys(buildCandidateQueue({ ...base, healing: undefined }))).toEqual([
      'OPENROUTER/a',
      'OPENROUTER/b',
    ]);
  });

  it('works for a team with no backups and no pool (a single-provider team still has b)', () => {
    const solo = { ...role, fallbacks: [] };
    expect(keys(buildCandidateQueue({ ...base, role: solo, healing: undefined }))).toEqual([
      'OPENROUTER/a',
    ]);
  });

  it('ranks pool models by recent success once they have enough samples and drops ones that always fail', () => {
    const health = new Map<string, CandidateHealth>([
      ['GEMINI/p1', { ok: 1, failed: 9 }],
      ['GROK/p2', { ok: 9, failed: 1 }],
      ['MISTRAL/p3', { ok: 0, failed: 5 }],
    ]);
    const queue = buildCandidateQueue({
      ...base,
      health,
      healing: {
        pool: [
          { provider: 'GEMINI', model: 'p1' },
          { provider: 'GROK', model: 'p2' },
          { provider: 'MISTRAL', model: 'p3' },
          { provider: 'NVIDIA', model: 'p4' },
        ],
      },
    });
    expect(keys(queue).slice(2)).toEqual(['GROK/p2', 'NVIDIA/p4', 'GEMINI/p1']);
  });

  it('skips a pool model whose published window cannot hold the prompt (4k window)', () => {
    const queue = buildCandidateQueue({
      ...base,
      healing: {
        pool: [
          { provider: 'GROK', model: 'tiny', windowTokens: 4096 },
          { provider: 'GEMINI', model: 'big', windowTokens: 1_000_000 },
          { provider: 'NVIDIA', model: 'unknown' },
        ],
      },
    });
    expect(keys(queue).slice(2)).toEqual(['GEMINI/big', 'NVIDIA/unknown']);
  });

  it('puts a primary that failed for its own reasons behind the owner backups', () => {
    const queue = buildCandidateQueue({
      ...base,
      demoted: new Set(['OPENROUTER/a']),
      healing: undefined,
    });
    expect(keys(queue)).toEqual(['OPENROUTER/b', 'OPENROUTER/a']);
  });

  it('keeps a demoted primary first when it has no backup to yield to', () => {
    const solo = { ...role, fallbacks: [] };
    const queue = buildCandidateQueue({
      ...base,
      role: solo,
      demoted: new Set(['OPENROUTER/a']),
      healing: undefined,
    });
    expect(keys(queue)).toEqual(['OPENROUTER/a']);
  });

  it('caps the pool per role', () => {
    const pool = Array.from({ length: 10 }, (_, index) => ({
      provider: `P${String(index)}`,
      model: 'm',
    }));
    expect(buildCandidateQueue({ ...base, healing: { pool } }).length).toBe(2 + 4);
  });
});

describe('orderAfterFailure and swapStrategy', () => {
  const remaining: QueuedCandidate[] = [
    { provider: 'OPENROUTER', model: 'b', origin: CandidateOrigin.TEAM },
    { provider: 'GEMINI', model: 'p1', origin: CandidateOrigin.POOL },
  ];

  it('moves same-provider candidates last after a provider-wide failure', () => {
    expect(
      keys(orderAfterFailure(remaining, 'OPENROUTER', ThreadFailureClass.PROVIDER_RATE_LIMITED)),
    ).toEqual(['GEMINI/p1', 'OPENROUTER/b']);
  });

  it('keeps the order after a failure that was the model’s own', () => {
    expect(
      keys(orderAfterFailure(remaining, 'OPENROUTER', ThreadFailureClass.WRONG_SHAPE)),
    ).toEqual(['OPENROUTER/b', 'GEMINI/p1']);
  });

  it('records a swap as the strategy of its origin', () => {
    expect(swapStrategy(CandidateOrigin.TEAM)).toBe(ThreadHealingStrategy.TEAM_FALLBACK);
    expect(swapStrategy(CandidateOrigin.POOL)).toBe(ThreadHealingStrategy.CROSS_PROVIDER);
    expect(swapStrategy(CandidateOrigin.SAFE_DEFAULT)).toBe(ThreadHealingStrategy.SAFE_DEFAULT);
  });
});
