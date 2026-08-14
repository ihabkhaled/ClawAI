import { SeedApplyOutcome } from '../../../common/enums';
import { DeploymentType, PrivacyClass, RouterProvider } from '../../../generated/prisma';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DeploymentSeedRepository } from '../repositories/deployment-seed.repository';
import type { DerivedDeployment, SeedApplyInput } from '../types/deployment-seed.types';

const deployment = (key: string): DerivedDeployment => ({
  definitionId: 'def_1',
  deploymentKey: key,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-2.5-flash',
  connectorId: 'conn_1',
  runtimeId: null,
  deploymentType: DeploymentType.CLOUD_API,
  privacyClass: PrivacyClass.CLOUD_PERMITTED,
  contextWindowTokens: null,
  maxOutputTokens: null,
  supportsTools: null,
  supportsStructuredOutput: null,
  supportsStreaming: null,
  supportsVision: null,
  metadataSource: 'deployment-backfill',
});

const input = (overrides: Partial<SeedApplyInput> = {}): SeedApplyInput => ({
  name: 'router-model-deployments-backfill',
  version: 1,
  checksum: 'checksum-a',
  deployments: [deployment('GEMINI:gemini-2.5-flash:conn_1')],
  ...overrides,
});

interface TransactionMocks {
  queryRaw: jest.Mock;
  seedFindUnique: jest.Mock;
  seedUpsert: jest.Mock;
  seedUpdate: jest.Mock;
  deploymentUpsert: jest.Mock;
}

const buildRepository = (
  existing: { status: string; checksum: string } | null,
): { repository: DeploymentSeedRepository; mocks: TransactionMocks } => {
  const mocks: TransactionMocks = {
    queryRaw: jest.fn().mockResolvedValue([]),
    seedFindUnique: jest.fn().mockResolvedValue(existing),
    seedUpsert: jest.fn().mockResolvedValue(undefined),
    seedUpdate: jest.fn().mockResolvedValue(undefined),
    deploymentUpsert: jest.fn().mockResolvedValue(undefined),
  };

  const transaction = {
    $queryRaw: mocks.queryRaw,
    seedExecution: {
      findUnique: mocks.seedFindUnique,
      upsert: mocks.seedUpsert,
      update: mocks.seedUpdate,
    },
    modelDeployment: { upsert: mocks.deploymentUpsert },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(transaction)),
  };

  return {
    repository: new DeploymentSeedRepository(prisma as unknown as PrismaService),
    mocks,
  };
};

describe('DeploymentSeedRepository.applyOnce', () => {
  describe('first run', () => {
    it('applies the deployments and closes the ledger row', async () => {
      const { repository, mocks } = buildRepository(null);

      await expect(repository.applyOnce(input())).resolves.toBe(SeedApplyOutcome.APPLIED);

      expect(mocks.seedUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'RUNNING' }),
        }),
      );
      expect(mocks.deploymentUpsert).toHaveBeenCalledTimes(1);
      expect(mocks.seedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', error: null }),
        }),
      );
    });

    // Several replicas boot at once. Without a transaction-scoped lock they race
    // to insert the same deploymentKey and one of them crashes on the unique.
    it('takes a transaction-scoped advisory lock before reading the ledger', async () => {
      const { repository, mocks } = buildRepository(null);

      await repository.applyOnce(input());

      expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
      expect(mocks.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.seedFindUnique.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
      );
    });

    // An operator may have edited a backfilled endpoint before the seed replays.
    // An empty update is what makes a replay gap-filling rather than destructive.
    it('never overwrites an existing deployment', async () => {
      const { repository, mocks } = buildRepository(null);

      await repository.applyOnce(input());

      expect(mocks.deploymentUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    });

    it('writes one row per derived deployment', async () => {
      const { repository, mocks } = buildRepository(null);

      await repository.applyOnce(
        input({
          deployments: [deployment('a'), deployment('b'), deployment('c')],
        }),
      );

      expect(mocks.deploymentUpsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('replay', () => {
    // The pack requires a second run to be a no-op.
    it('is a no-op when the same version already completed with the same payload', async () => {
      const { repository, mocks } = buildRepository({
        status: 'COMPLETED',
        checksum: 'checksum-a',
      });

      await expect(repository.applyOnce(input())).resolves.toBe(SeedApplyOutcome.ALREADY_APPLIED);

      expect(mocks.deploymentUpsert).not.toHaveBeenCalled();
      expect(mocks.seedUpsert).not.toHaveBeenCalled();
      expect(mocks.seedUpdate).not.toHaveBeenCalled();
    });

    it('reports a mismatch without writing when the payload changed under a completed version', async () => {
      const { repository, mocks } = buildRepository({
        status: 'COMPLETED',
        checksum: 'checksum-original',
      });

      await expect(repository.applyOnce(input({ checksum: 'checksum-changed' }))).resolves.toBe(
        SeedApplyOutcome.CHECKSUM_MISMATCH,
      );

      expect(mocks.deploymentUpsert).not.toHaveBeenCalled();
      expect(mocks.seedUpsert).not.toHaveBeenCalled();
    });

    // A crashed run leaves RUNNING behind. Refusing to retry would wedge the
    // service permanently, so an unfinished row is resumable.
    it('retries a previous run that never completed', async () => {
      const { repository, mocks } = buildRepository({
        status: 'RUNNING',
        checksum: 'checksum-a',
      });

      await expect(repository.applyOnce(input())).resolves.toBe(SeedApplyOutcome.APPLIED);
      expect(mocks.deploymentUpsert).toHaveBeenCalledTimes(1);
    });
  });

  it('runs the whole apply inside one transaction', async () => {
    const { repository } = buildRepository(null);
    const prismaTransaction = jest.fn().mockResolvedValue(SeedApplyOutcome.APPLIED);
    const bare = new DeploymentSeedRepository({
      $transaction: prismaTransaction,
    } as unknown as PrismaService);

    await bare.applyOnce(input());

    expect(prismaTransaction).toHaveBeenCalledTimes(1);
    await expect(repository.applyOnce(input())).resolves.toBe(SeedApplyOutcome.APPLIED);
  });
});
