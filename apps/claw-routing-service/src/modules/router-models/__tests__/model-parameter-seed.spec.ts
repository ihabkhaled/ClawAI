import { type Mock, vi } from 'vitest';
import { SeedApplyOutcome } from '../../../common/enums';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MODEL_PARAMETER_SEED_NAME,
  MODEL_PARAMETER_SEED_VERSION,
} from '../constants/model-parameter-count.constants';
import { ModelParameterSeedRepository } from '../repositories/model-parameter-seed.repository';
import { ModelParameterSeedService } from '../services/model-parameter-seed.service';

type RegistryRow = { id: string; modelKey: string };

interface TransactionMocks {
  seedFindUnique: Mock;
  seedUpsert: Mock;
  seedUpdate: Mock;
  registryFindMany: Mock;
  registryUpdate: Mock;
  overrideFindMany: Mock;
}

const buildRepository = (
  existing: { status: string; checksum: string } | null,
  rows: RegistryRow[] = [],
  pinnedProfileIds: string[] = [],
): { repository: ModelParameterSeedRepository; mocks: TransactionMocks } => {
  const mocks: TransactionMocks = {
    seedFindUnique: vi.fn().mockResolvedValue(existing),
    seedUpsert: vi.fn().mockResolvedValue(undefined),
    seedUpdate: vi.fn().mockResolvedValue(undefined),
    registryFindMany: vi.fn().mockResolvedValue(rows),
    registryUpdate: vi.fn().mockResolvedValue(undefined),
    overrideFindMany: vi
      .fn()
      .mockResolvedValue(pinnedProfileIds.map((profileId) => ({ profileId }))),
  };
  const transaction = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    seedExecution: {
      findUnique: mocks.seedFindUnique,
      upsert: mocks.seedUpsert,
      update: mocks.seedUpdate,
    },
    routerModelRegistry: { findMany: mocks.registryFindMany, update: mocks.registryUpdate },
    routerAdminOverride: { findMany: mocks.overrideFindMany },
  };
  const prisma = {
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(transaction)),
  };
  return {
    repository: new ModelParameterSeedRepository(prisma as unknown as PrismaService),
    mocks,
  };
};

const input = {
  name: MODEL_PARAMETER_SEED_NAME,
  version: MODEL_PARAMETER_SEED_VERSION,
  checksum: 'checksum-a',
};

describe('ModelParameterSeedRepository.applyOnce', () => {
  it('fills only the rows a maker-published rule matches, and closes the ledger', async () => {
    const { repository, mocks } = buildRepository(null, [
      { id: 'r1', modelKey: 'openai/gpt-oss-120b' },
      { id: 'r2', modelKey: 'gpt-5.4' },
      { id: 'r3', modelKey: 'google/gemma-3-27b-it' },
    ]);

    await expect(repository.applyOnce(input)).resolves.toEqual({
      outcome: SeedApplyOutcome.APPLIED,
      filled: 2,
      skipped: 1,
    });

    expect(mocks.registryUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.registryUpdate).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { parameterCountBillions: 117, activeParameterCountBillions: 5.1 },
    });
    expect(mocks.registryUpdate).toHaveBeenCalledWith({
      where: { id: 'r3' },
      data: { parameterCountBillions: 27, activeParameterCountBillions: null },
    });
    expect(mocks.seedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('only ever reads rows with no count yet, never a removed one', async () => {
    const { repository, mocks } = buildRepository(null);

    await repository.applyOnce(input);

    expect(mocks.registryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parameterCountBillions: null }),
      }),
    );
  });

  it('leaves a row an admin pinned, even when a rule matches it', async () => {
    const { repository, mocks } = buildRepository(
      null,
      [{ id: 'pinned', modelKey: 'openai/gpt-oss-120b' }],
      ['pinned'],
    );

    await expect(repository.applyOnce(input)).resolves.toMatchObject({ filled: 0, skipped: 1 });

    expect(mocks.registryUpdate).not.toHaveBeenCalled();
  });

  it('short-circuits a version the ledger already completed', async () => {
    const { repository, mocks } = buildRepository({
      status: 'COMPLETED',
      checksum: 'checksum-a',
    });

    await expect(repository.applyOnce(input)).resolves.toEqual({
      outcome: SeedApplyOutcome.ALREADY_APPLIED,
      filled: 0,
      skipped: 0,
    });
    expect(mocks.registryFindMany).not.toHaveBeenCalled();
  });

  it('reports, and does not re-apply, an edited rule table under the same version', async () => {
    const { repository, mocks } = buildRepository({
      status: 'COMPLETED',
      checksum: 'an-older-table',
    });

    await expect(repository.applyOnce(input)).resolves.toMatchObject({
      outcome: SeedApplyOutcome.CHECKSUM_MISMATCH,
    });
    expect(mocks.registryUpdate).not.toHaveBeenCalled();
  });
});

describe('ModelParameterSeedService', () => {
  const buildService = (applyOnce: Mock): ModelParameterSeedService =>
    new ModelParameterSeedService({ applyOnce } as unknown as ModelParameterSeedRepository);

  it('seeds the named, versioned ledger entry with a checksum of the rule table', async () => {
    const applyOnce = vi
      .fn()
      .mockResolvedValue({ outcome: SeedApplyOutcome.APPLIED, filled: 3, skipped: 1 });

    await buildService(applyOnce).onModuleInit();

    expect(applyOnce).toHaveBeenCalledWith({
      name: MODEL_PARAMETER_SEED_NAME,
      version: MODEL_PARAMETER_SEED_VERSION,
      checksum: expect.stringMatching(/^[0-9a-f]{16,}$/),
    });
  });

  it('computes the same checksum on every boot', async () => {
    const applyOnce = vi
      .fn()
      .mockResolvedValue({ outcome: SeedApplyOutcome.ALREADY_APPLIED, filled: 0, skipped: 0 });
    const service = buildService(applyOnce);

    await service.seed();
    await service.seed();

    const checksums = applyOnce.mock.calls.map(
      (call) => (call[0] as { checksum: string }).checksum,
    );
    expect(checksums[0]).toBe(checksums[1]);
  });
});
