import {
  BillingModel,
  Prisma,
  type RouterChainEntry,
  RouterChainEntryRole,
  type RouterConfiguration,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '../../../generated/prisma';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RouterConfigurationRepository } from '../repositories/router-configuration.repository';
import type { ChainEntryInput } from '../../router-configuration-admin/types/router-configuration-admin.types';

const entryRow = (overrides: Partial<RouterChainEntry> = {}): RouterChainEntry => ({
  id: 'entry_1',
  configurationId: 'config_1',
  order: 1,
  enabled: true,
  role: RouterChainEntryRole.PRIMARY,
  deploymentId: null,
  modelAlias: 'gemini-2.5-flash',
  provider: RouterProvider.GEMINI,
  attemptTimeoutMs: 1600,
  retries: 0,
  triggers: [],
  skipWhenProviderCircuitOpen: true,
  minConfidence: null,
  maxCostMicroUsd: null,
  billingModel: BillingModel.UNKNOWN,
  lastValidatedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const configRow = (
  overrides: Partial<RouterConfiguration> = {},
  entries: RouterChainEntry[] = [],
): RouterConfiguration & { entries: RouterChainEntry[] } => ({
  id: 'config_1',
  scope: 'GLOBAL',
  revision: 1,
  status: RouterConfigurationStatus.DRAFT,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: false,
  totalDeadlineMs: 5000,
  maxAttempts: 6,
  maxRouterInputTokens: 1800,
  maxRouterOutputTokens: 320,
  minConfidence: new Prisma.Decimal(0.75),
  lowConfidenceAction: 'QUALITY_ESCALATION_THEN_DETERMINISTIC' as never,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'DETAILED_FACTORS',
  legacyLocalRollbackEnabled: true,
  supersedesRevision: null,
  publishedAt: null,
  publishedBy: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  entries,
  ...overrides,
});

interface TransactionMocks {
  configFindFirst: jest.Mock;
  configFindUnique: jest.Mock;
  configFindUniqueOrThrow: jest.Mock;
  configCreate: jest.Mock;
  configUpdate: jest.Mock;
  configCount: jest.Mock;
  configFindMany: jest.Mock;
  entryDeleteMany: jest.Mock;
  entryCreate: jest.Mock;
}

const buildRepository = (): {
  repository: RouterConfigurationRepository;
  mocks: TransactionMocks;
  arrayTransaction: jest.Mock;
} => {
  const mocks: TransactionMocks = {
    configFindFirst: jest.fn(),
    configFindUnique: jest.fn(),
    configFindUniqueOrThrow: jest.fn(),
    configCreate: jest.fn(),
    configUpdate: jest.fn(),
    configCount: jest.fn(),
    configFindMany: jest.fn(),
    entryDeleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    entryCreate: jest.fn(),
  };

  const transaction = {
    routerConfiguration: {
      findFirst: mocks.configFindFirst,
      findUnique: mocks.configFindUnique,
      findUniqueOrThrow: mocks.configFindUniqueOrThrow,
      create: mocks.configCreate,
      update: mocks.configUpdate,
      count: mocks.configCount,
      findMany: mocks.configFindMany,
    },
    routerChainEntry: {
      deleteMany: mocks.entryDeleteMany,
      create: mocks.entryCreate,
    },
  };

  const arrayTransaction = jest.fn();

  const prisma = {
    $transaction: jest.fn().mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) {
        return arrayTransaction(arg);
      }
      return (arg as (tx: unknown) => unknown)(transaction);
    }),
    routerConfiguration: {
      findFirst: mocks.configFindFirst,
      findUnique: mocks.configFindUnique,
      findMany: mocks.configFindMany,
      count: mocks.configCount,
    },
  };

  return {
    repository: new RouterConfigurationRepository(prisma as unknown as PrismaService),
    mocks,
    arrayTransaction,
  };
};

describe('RouterConfigurationRepository (admin methods)', () => {
  describe('listRevisions', () => {
    it('scopes by status when provided and maps rows with entryCount', async () => {
      const { repository, arrayTransaction } = buildRepository();
      arrayTransaction.mockResolvedValue([[configRow({}, [entryRow()])], 1]);

      const result = await repository.listRevisions({
        scope: 'GLOBAL',
        status: RouterConfigurationStatus.DRAFT,
        skip: 0,
        take: 20,
      });

      expect(result.total).toBe(1);
      expect(result.items[0]?.entryCount).toBe(1);
      expect(result.items[0]).not.toHaveProperty('entries');
    });

    it('omits the status filter when not given', async () => {
      const { repository, mocks, arrayTransaction } = buildRepository();
      arrayTransaction.mockResolvedValue([[], 0]);

      await repository.listRevisions({ scope: 'GLOBAL', skip: 0, take: 20 });

      const findManyCall = mocks.configFindMany.mock.calls[0]?.[0] as { where: unknown };
      expect(findManyCall.where).toEqual({ scope: 'GLOBAL' });
    });
  });

  describe('findRevisionById', () => {
    it('returns null when not found', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(null);
      await expect(repository.findRevisionById('missing')).resolves.toBeNull();
    });

    it('returns entries sorted by order', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(
        configRow({}, [entryRow({ id: 'e2', order: 2 }), entryRow({ id: 'e1', order: 1 })]),
      );
      const result = await repository.findRevisionById('config_1');
      expect(result?.entries.map((e) => e.id)).toEqual(['e1', 'e2']);
    });
  });

  describe('findPublishedRevision', () => {
    it('queries by PUBLISHED status', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindFirst.mockResolvedValue(null);
      await repository.findPublishedRevision('GLOBAL');
      expect(mocks.configFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope: 'GLOBAL', status: RouterConfigurationStatus.PUBLISHED },
        }),
      );
    });
  });

  describe('createDraft', () => {
    it('starts empty at revision 1 when no PUBLISHED revision exists for the scope', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindFirst.mockResolvedValueOnce(null); // latest revision lookup
      mocks.configFindFirst.mockResolvedValueOnce(null); // published-source lookup
      mocks.configCreate.mockResolvedValue(configRow({ revision: 1 }));
      mocks.configFindUniqueOrThrow.mockResolvedValue(configRow({ revision: 1 }));

      const result = await repository.createDraft('GLOBAL');

      expect(mocks.configCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'GLOBAL', revision: 1, mode: undefined }),
        }),
      );
      expect(mocks.entryCreate).not.toHaveBeenCalled();
      expect(result.revision).toBe(1);
    });

    it('copies config fields and entries from the currently PUBLISHED revision', async () => {
      const { repository, mocks } = buildRepository();
      const published = configRow({ revision: 3, status: RouterConfigurationStatus.PUBLISHED }, [
        entryRow({ id: 'e1', order: 1 }),
      ]);
      mocks.configFindFirst.mockResolvedValueOnce({ revision: 5 }); // latest revision lookup
      mocks.configFindFirst.mockResolvedValueOnce(published); // published-source lookup
      mocks.configCreate.mockResolvedValue(configRow({ id: 'config_new', revision: 6 }));
      mocks.configFindUniqueOrThrow.mockResolvedValue(
        configRow({ id: 'config_new', revision: 6 }, [entryRow({ configurationId: 'config_new' })]),
      );

      const result = await repository.createDraft('GLOBAL');

      expect(mocks.configCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revision: 6 }) }),
      );
      expect(mocks.entryCreate).toHaveBeenCalledTimes(1);
      expect(result.revision).toBe(6);
    });
  });

  describe('replaceEntries', () => {
    it('deletes all existing entries before recreating the given list in order', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(configRow({}, [entryRow()]));

      const entries: ChainEntryInput[] = [
        {
          role: RouterChainEntryRole.PRIMARY,
          provider: RouterProvider.GEMINI,
          modelAlias: 'gemini-2.5-flash',
          enabled: true,
          attemptTimeoutMs: 1600,
          retries: 0,
          triggers: [],
          skipWhenProviderCircuitOpen: true,
          billingModel: BillingModel.UNKNOWN,
        },
        {
          role: RouterChainEntryRole.PROVIDER_FALLBACK,
          provider: RouterProvider.OLLAMA_CLOUD,
          modelAlias: 'gpt-oss-120b',
          enabled: true,
          attemptTimeoutMs: 1600,
          retries: 0,
          triggers: [],
          skipWhenProviderCircuitOpen: true,
          billingModel: BillingModel.SUBSCRIPTION,
        },
      ];

      await repository.replaceEntries('config_1', entries);

      expect(mocks.entryDeleteMany).toHaveBeenCalledWith({
        where: { configurationId: 'config_1' },
      });
      expect(mocks.entryCreate).toHaveBeenCalledTimes(2);
      expect(mocks.entryCreate.mock.calls[0]?.[0]).toMatchObject({ data: { order: 1 } });
      expect(mocks.entryCreate.mock.calls[1]?.[0]).toMatchObject({ data: { order: 2 } });
    });

    it('returns null when the configuration no longer exists', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(null);
      await expect(repository.replaceEntries('missing', [])).resolves.toBeNull();
    });
  });

  describe('publish', () => {
    it('returns null when the target does not exist', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(null);
      await expect(repository.publish('missing', 'user_1')).resolves.toBeNull();
    });

    it('returns null when the target is not DRAFT', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(
        configRow({ status: RouterConfigurationStatus.SUPERSEDED }),
      );
      await expect(repository.publish('config_1', 'user_1')).resolves.toBeNull();
    });

    it('publishes directly when nothing is currently published for the scope', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(
        configRow({ status: RouterConfigurationStatus.DRAFT }),
      );
      mocks.configFindFirst.mockResolvedValue(null);
      mocks.configUpdate.mockResolvedValue(
        configRow({ status: RouterConfigurationStatus.PUBLISHED }),
      );

      await repository.publish('config_1', 'user_1');

      expect(mocks.configUpdate).toHaveBeenCalledTimes(1);
      expect(mocks.configUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RouterConfigurationStatus.PUBLISHED,
            publishedBy: 'user_1',
            supersedesRevision: null,
          }),
        }),
      );
    });

    it('marks the previously PUBLISHED revision SUPERSEDED in the same transaction', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindUnique.mockResolvedValue(
        configRow({ id: 'config_new', status: RouterConfigurationStatus.DRAFT, revision: 4 }),
      );
      mocks.configFindFirst.mockResolvedValue(
        configRow({ id: 'config_old', status: RouterConfigurationStatus.PUBLISHED, revision: 3 }),
      );
      mocks.configUpdate.mockResolvedValue(configRow({ id: 'config_new' }));

      await repository.publish('config_new', 'user_1');

      expect(mocks.configUpdate).toHaveBeenCalledTimes(2);
      expect(mocks.configUpdate.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'config_old' },
        data: { status: RouterConfigurationStatus.SUPERSEDED },
      });
      expect(mocks.configUpdate.mock.calls[1]?.[0]).toMatchObject({
        where: { id: 'config_new' },
        data: { supersedesRevision: 3 },
      });
    });
  });

  describe('setEnabled', () => {
    it('returns null when no revision is PUBLISHED for the scope', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindFirst.mockResolvedValue(null);
      await expect(repository.setEnabled('GLOBAL', true)).resolves.toBeNull();
    });

    it('flips enabled on the currently PUBLISHED revision', async () => {
      const { repository, mocks } = buildRepository();
      mocks.configFindFirst.mockResolvedValue(
        configRow({ status: RouterConfigurationStatus.PUBLISHED, enabled: false }),
      );
      mocks.configUpdate.mockResolvedValue(
        configRow({ status: RouterConfigurationStatus.PUBLISHED, enabled: true }),
      );

      const result = await repository.setEnabled('GLOBAL', true);

      expect(mocks.configUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { enabled: true } }),
      );
      expect(result?.enabled).toBe(true);
    });
  });
});
