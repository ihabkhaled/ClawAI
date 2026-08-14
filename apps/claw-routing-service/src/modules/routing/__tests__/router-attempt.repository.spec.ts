import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RouterAttemptRepository } from '../repositories/router-attempt.repository';
import type { ProviderAttemptRecord } from '../types/router-attempt.types';
import type { RouterAttemptRecord } from '../types/router-inference.types';
import { toAttemptRecords } from '../utilities/router-attempt-mapping.utility';

const coordinatorAttempt = (overrides: Partial<RouterAttemptRecord> = {}): RouterAttemptRecord => ({
  entryId: 'e1',
  order: 1,
  attemptNumber: 1,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-3.5-flash-lite',
  deploymentId: 'dep_1',
  outcome: 'FAILURE',
  code: RouterErrorCode.TIMEOUT,
  safeMessage: 'TIMEOUT',
  latencyMs: 1_600,
  wasRepair: false,
  ...overrides,
});

const persisted = (overrides: Partial<ProviderAttemptRecord> = {}): ProviderAttemptRecord => ({
  traceId: 't1',
  decisionId: null,
  attemptOrder: 1,
  chainEntryId: 'e1',
  chainOrder: 1,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-3.5-flash-lite',
  deploymentId: 'dep_1',
  succeeded: false,
  errorCode: RouterErrorCode.TIMEOUT,
  safeMessage: 'TIMEOUT',
  wasRepair: false,
  latencyMs: 1_600,
  inputTokens: null,
  outputTokens: null,
  ...overrides,
});

const buildRepo = (
  overrides: { createMany?: jest.Mock; scoreCreateMany?: jest.Mock } = {},
): {
  repository: RouterAttemptRepository;
  createMany: jest.Mock;
  scoreCreateMany: jest.Mock;
} => {
  const createMany = overrides.createMany ?? jest.fn().mockResolvedValue({ count: 1 });
  const scoreCreateMany = overrides.scoreCreateMany ?? jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    routerProviderAttempt: { createMany, findMany: jest.fn().mockResolvedValue([]) },
    routingCandidateScore: { createMany: scoreCreateMany },
  };
  return {
    repository: new RouterAttemptRepository(prisma as unknown as PrismaService),
    createMany,
    scoreCreateMany,
  };
};

describe('toAttemptRecords', () => {
  // The coordinator's attemptNumber restarts at 1 for every entry, so two
  // entries would both claim order 1 and collide on the (traceId, attemptOrder)
  // unique — silently dropping one and losing the fallback evidence these rows
  // exist to preserve.
  it('numbers attempts across the whole walk, not per entry', () => {
    const rows = toAttemptRecords('t1', [
      coordinatorAttempt({ entryId: 'e1', order: 1, attemptNumber: 1 }),
      coordinatorAttempt({ entryId: 'e1', order: 1, attemptNumber: 2 }),
      coordinatorAttempt({ entryId: 'e2', order: 2, attemptNumber: 1 }),
    ]);

    expect(rows.map((r) => r.attemptOrder)).toEqual([1, 2, 3]);
    expect(new Set(rows.map((r) => r.attemptOrder)).size).toBe(3);
  });

  it('preserves which chain entry produced each attempt', () => {
    const rows = toAttemptRecords('t1', [
      coordinatorAttempt({ entryId: 'e1', order: 1 }),
      coordinatorAttempt({ entryId: 'e2', order: 2 }),
    ]);

    expect(rows[0]?.chainEntryId).toBe('e1');
    expect(rows[1]?.chainOrder).toBe(2);
  });

  it('maps outcome to a boolean and keeps the canonical code', () => {
    const [failure, success] = toAttemptRecords('t1', [
      coordinatorAttempt({ outcome: 'FAILURE', code: RouterErrorCode.RATE_LIMITED }),
      coordinatorAttempt({ outcome: 'SUCCESS', code: null, safeMessage: null }),
    ]);

    expect(failure?.succeeded).toBe(false);
    expect(failure?.errorCode).toBe(RouterErrorCode.RATE_LIMITED);
    expect(success?.succeeded).toBe(true);
    expect(success?.errorCode).toBeNull();
  });

  it('carries the repair flag through', () => {
    const [row] = toAttemptRecords('t1', [coordinatorAttempt({ wasRepair: true })]);
    expect(row?.wasRepair).toBe(true);
  });

  it('returns nothing for an empty walk', () => {
    expect(toAttemptRecords('t1', [])).toEqual([]);
  });
});

describe('RouterAttemptRepository.recordAttempts', () => {
  it('writes every attempt in one call', async () => {
    const { repository, createMany } = buildRepo({
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
    });

    const written = await repository.recordAttempts([
      persisted({ attemptOrder: 1 }),
      persisted({ attemptOrder: 2 }),
      persisted({ attemptOrder: 3 }),
    ]);

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(written).toBe(3);
  });

  // A republished trace must not blow up on the unique constraint.
  it('is idempotent on a repeated trace', async () => {
    const { repository, createMany } = buildRepo();

    await repository.recordAttempts([persisted()]);

    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  // A decision that succeeded must not be failed retroactively because its
  // audit trail could not be written.
  it('never throws when the write fails', async () => {
    const { repository } = buildRepo({
      createMany: jest.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(repository.recordAttempts([persisted()])).resolves.toBe(0);
  });

  it('does not touch the database for an empty walk', async () => {
    const { repository, createMany } = buildRepo();

    await expect(repository.recordAttempts([])).resolves.toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  // These rows feed a trace event, so they must carry codes and never content.
  it('persists only safe fields', async () => {
    const { repository, createMany } = buildRepo();

    await repository.recordAttempts([persisted({ safeMessage: 'PROVIDER_5XX' })]);

    const row = (createMany.mock.calls[0]?.[0]?.data as Record<string, unknown>[])[0];
    expect(Object.keys(row ?? {})).not.toContain('prompt');
    expect(Object.keys(row ?? {})).not.toContain('rawResponse');
    expect(row?.['safeMessage']).toBe('PROVIDER_5XX');
  });
});

describe('RouterAttemptRepository.recordCandidateScores', () => {
  it('writes a ranked candidate set', async () => {
    const { repository } = buildRepo({
      scoreCreateMany: jest.fn().mockResolvedValue({ count: 2 }),
    });

    const written = await repository.recordCandidateScores([
      {
        traceId: 't1',
        decisionId: null,
        deploymentId: 'dep_1',
        provider: RouterProvider.GEMINI,
        providerModelId: 'gemini-3.5-flash-lite',
        eligible: true,
        exclusionReason: null,
        score: 0.91,
        uncertainty: 0.05,
        factors: { DOMAIN_MATCH: 0.4 },
        rank: 1,
      },
      {
        traceId: 't1',
        decisionId: null,
        deploymentId: 'dep_2',
        provider: RouterProvider.OLLAMA_CLOUD,
        providerModelId: 'gpt-oss:120b',
        eligible: false,
        exclusionReason: 'PRIVACY_BLOCKED',
        score: null,
        uncertainty: null,
        factors: null,
        rank: null,
      },
    ]);

    expect(written).toBe(2);
  });

  it('never throws when the write fails', async () => {
    const { repository } = buildRepo({
      scoreCreateMany: jest.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(
      repository.recordCandidateScores([
        {
          traceId: 't1',
          decisionId: null,
          deploymentId: 'dep_1',
          provider: RouterProvider.GEMINI,
          providerModelId: 'm',
          eligible: true,
          exclusionReason: null,
          score: 0.5,
          uncertainty: null,
          factors: null,
          rank: 1,
        },
      ]),
    ).resolves.toBe(0);
  });

  it('does not touch the database for an empty set', async () => {
    const { repository, scoreCreateMany } = buildRepo();

    await expect(repository.recordCandidateScores([])).resolves.toBe(0);
    expect(scoreCreateMany).not.toHaveBeenCalled();
  });
});
